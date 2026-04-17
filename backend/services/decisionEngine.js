/**
 * decisionEngine.js
 * -----------------
 * Unified pre-payout gate. One call, one verdict.
 *
 * Order (cheap → expensive):
 *   1. Policy check   — claim exists, policy active, claim in payable state,
 *                       not already disbursed. Pure DB lookup.
 *   2. Fraud re-check — run fraudDetection with fresh user history to catch
 *                       post-creation signals (e.g. rapid secondary claims).
 *                       Re-evaluation at payout time is the whole point —
 *                       the verdict captured at claim creation is stale.
 *   3. Reserve check  — solvency gate, last because it's the most expensive
 *                       and there's no point running it on invalid claims.
 *
 * Outcomes:
 *   AUTO   — all checks passed; caller proceeds with disbursement
 *   REVIEW — fraud score in soft band (30–69); caller parks claim for admin
 *   BLOCK  — hard-fail (invalid policy, high fraud, or insufficient reserves)
 *
 * Callers must NOT run these checks again. This function is the chokepoint.
 */

const { Op } = require('sequelize')
const Claim  = require('../models/Claim')
const Policy = require('../models/Policy')
const { detectFraud } = require('./fraudDetection')
const reserveService  = require('./reserveService')
const { PLAN_CONFIG } = require('../utils/premiumCalculator')

// Fraud scoring bands — align with fraudDetection's 0–~100+ aggregate
const FRAUD_BLOCK_SCORE  = 70
const FRAUD_REVIEW_SCORE = 30

const PAYABLE_STATUSES = new Set(['approved'])
const TERMINAL_PAYOUT_STATUSES = new Set(['disbursed', 'clawed_back'])

function blockVerdict(reasons, checks = {}) {
  return { action: 'BLOCK', reasons, checks }
}

const DAY_MS  = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

/**
 * Check cumulative disbursed payouts against plan-level daily/weekly caps.
 * Only counts claims already marked `disbursed` — in-flight queued claims
 * don't count toward the cap until they actually fire.
 *
 * @param {number} userId
 * @param {string} planType   policy.type — matches PLAN_CONFIG keys (case-insensitive)
 * @param {number} proposedAmount
 * @returns {{ok, reason?}}
 */
async function _checkPayoutCaps(userId, planType, proposedAmount) {
  const plan = PLAN_CONFIG[String(planType || 'standard').toLowerCase()]
  if (!plan) return { ok: true }  // unknown plan → skip cap check, don't hard-fail

  const now = Date.now()

  const [dailySum, weeklySum] = await Promise.all([
    Claim.sum('amount', {
      where: {
        userId,
        payout_status: 'disbursed',
        payoutUpdatedAt: { [Op.gte]: new Date(now - DAY_MS) }
      }
    }),
    Claim.sum('amount', {
      where: {
        userId,
        payout_status: 'disbursed',
        payoutUpdatedAt: { [Op.gte]: new Date(now - WEEK_MS) }
      }
    })
  ])

  const daily  = parseFloat(dailySum) || 0
  const weekly = parseFloat(weeklySum) || 0

  if (daily + proposedAmount > plan.dailyPayoutCap) {
    return {
      ok:      false,
      reason:  `Daily payout cap would be exceeded: ₹${daily} paid + ₹${proposedAmount} proposed > ₹${plan.dailyPayoutCap} cap`,
      code:    'DAILY_CAP_EXCEEDED',
      daily,
      cap:     plan.dailyPayoutCap
    }
  }
  if (weekly + proposedAmount > plan.weeklyPayoutCap) {
    return {
      ok:      false,
      reason:  `Weekly payout cap would be exceeded: ₹${weekly} paid + ₹${proposedAmount} proposed > ₹${plan.weeklyPayoutCap} cap`,
      code:    'WEEKLY_CAP_EXCEEDED',
      weekly,
      cap:     plan.weeklyPayoutCap
    }
  }
  return { ok: true, daily, weekly, dailyCap: plan.dailyPayoutCap, weeklyCap: plan.weeklyPayoutCap }
}

/**
 * Run the unified gate for a claim about to be paid out.
 *
 * @param {number} claimId
 * @param {number} proposedAmount  the ₹ amount that would be disbursed
 * @returns {Promise<{action, reasons, checks}>}
 *   action: 'AUTO' | 'REVIEW' | 'BLOCK'
 *   reasons: string[] (flat list, newest at end)
 *   checks: { policy, fraud, reserve } — individual check results for audit
 */
async function gateClaimForPayout(claimId, proposedAmount) {
  if (!claimId) throw new Error('claimId is required')
  if (!Number.isFinite(proposedAmount) || proposedAmount <= 0) {
    throw new Error('proposedAmount must be a positive number')
  }

  const checks = { policy: null, fraud: null, reserve: null }

  // ── 1. POLICY CHECK ────────────────────────────────────────────────────────
  const claim = await Claim.findByPk(claimId, {
    include: [{ model: Policy, as: 'policy' }]
  })

  if (!claim) {
    return blockVerdict(['Claim not found'], { policy: { ok: false, reason: 'claim_missing' } })
  }
  if (!claim.policy) {
    return blockVerdict(['Claim has no linked policy'], { policy: { ok: false, reason: 'policy_missing' } })
  }
  if (claim.policy.status !== 'active') {
    return blockVerdict(
      [`Policy is '${claim.policy.status}', not active`],
      { policy: { ok: false, reason: 'policy_inactive', status: claim.policy.status } }
    )
  }
  if (!PAYABLE_STATUSES.has(claim.status)) {
    return blockVerdict(
      [`Claim status '${claim.status}' is not payable (must be 'approved')`],
      { policy: { ok: false, reason: 'claim_not_approved', status: claim.status } }
    )
  }
  if (TERMINAL_PAYOUT_STATUSES.has(claim.payout_status)) {
    return blockVerdict(
      [`Claim payout_status is '${claim.payout_status}' — already finalised`],
      { policy: { ok: false, reason: 'already_paid', payout_status: claim.payout_status } }
    )
  }

  // Per-user daily/weekly payout caps (plan-scoped). Folded into the policy
  // stage because it's cheap DB aggregation and gates everything downstream.
  const capCheck = await _checkPayoutCaps(claim.userId, claim.policy.type, proposedAmount)
  if (!capCheck.ok) {
    return blockVerdict(
      [capCheck.reason],
      { policy: { ok: false, reason: capCheck.code, ...capCheck } }
    )
  }
  checks.policy = { ok: true, caps: capCheck }

  // ── 2. FRAUD RE-CHECK ─────────────────────────────────────────────────────
  // Fetch user's other claims for cohort-based signals (rapid succession,
  // 30-day frequency, etc.). Exclude the current claim from its own history.
  const userHistory = await Claim.findAll({
    where: {
      userId: claim.userId,
      id:     { [Op.ne]: claim.id }
    },
    attributes: ['id', 'amount', 'triggerType', 'submittedAt', 'status'],
    order: [['submittedAt', 'DESC']],
    limit: 100  // bound the scan; 100 prior claims is generous for any user
  })

  const fraud = detectFraud({
    amount:           parseFloat(claim.amount),
    policyCoverage:   parseFloat(claim.policy.coverage),
    description:      claim.description,
    weatherCondition: claim.triggerType, // best-effort; null if not set
    triggerType:      claim.triggerType,
    submittedAt:      claim.submittedAt
  }, userHistory.map(h => ({
    amount:       parseFloat(h.amount),
    triggerType:  h.triggerType,
    submittedAt:  h.submittedAt
  })))

  checks.fraud = fraud

  if (fraud.riskScore >= FRAUD_BLOCK_SCORE) {
    return blockVerdict(
      [`Fraud score ${fraud.riskScore} ≥ ${FRAUD_BLOCK_SCORE}: ${fraud.reasons.join('; ')}`],
      checks
    )
  }

  // Soft band → REVIEW. Skip reserve check (no point burning it on a claim
  // that an admin has to approve anyway).
  if (fraud.riskScore >= FRAUD_REVIEW_SCORE) {
    return {
      action:  'REVIEW',
      reasons: [`Fraud score ${fraud.riskScore} in review band (${FRAUD_REVIEW_SCORE}–${FRAUD_BLOCK_SCORE}): ${fraud.reasons.join('; ')}`],
      checks
    }
  }

  // ── 3. RESERVE CHECK ──────────────────────────────────────────────────────
  try {
    const reserveResult = await reserveService.checkBeforePayout(proposedAmount)
    checks.reserve = reserveResult
  } catch (err) {
    if (err.code === 'INSUFFICIENT_RESERVES') {
      checks.reserve = {
        ok:               false,
        code:             'INSUFFICIENT_RESERVES',
        currentRatio:     err.currentRatio,
        prospectiveRatio: err.prospectiveRatio,
        message:          err.message
      }
      return blockVerdict([err.message], checks)
    }
    throw err  // genuine system error — surface, don't silently block
  }

  return {
    action:  'AUTO',
    reasons: [],
    checks
  }
}

module.exports = {
  gateClaimForPayout,
  FRAUD_BLOCK_SCORE,
  FRAUD_REVIEW_SCORE
}
