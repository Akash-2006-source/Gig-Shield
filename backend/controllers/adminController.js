const User    = require('../models/User')
const Policy  = require('../models/Policy')
const Claim   = require('../models/Claim')
const RiskZone = require('../models/RiskZone')
const Reserve  = require('../models/Reserve')
const { getFraudAssessment } = require('../services/mlService')
const { buildDataset } = require('../services/trainingDataService')
const ClaimLabel = require('../models/ClaimLabel')
const UserScore  = require('../models/UserScore')
const CLAIM_LABEL_VALUES = ClaimLabel.LABEL_VALUES  // ['legit', 'fraud', 'uncertain']
const { createNotification } = require('../services/notificationService')
const { recomputeForUser: recomputeBalance } = require('../services/userBalanceService')
const reserveService = require('../services/reserveService')
const { Op, fn, col } = require('sequelize')

// ── Dashboard stats with actuarial metrics ───────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const workersInsured = await User.count({ where: { role: 'worker' } })
    const activePolicies = await Policy.count({ where: { status: 'active' } })

    const totalPremiumResult = await Policy.sum('premium', { where: { status: 'active' } })
    const totalPremium = totalPremiumResult || 0

    const totalPayoutResult = await Claim.sum('amount', { where: { status: 'approved' } })
    const totalPayout = totalPayoutResult || 0

    const flaggedCount = await Claim.count({ where: { status: 'flagged' } })

    const today    = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

    const claimsToday    = await Claim.count({ where: { submittedAt: { [Op.gte]: today, [Op.lt]: tomorrow } } })
    const claimsThisWeek = await Claim.count({ where: { submittedAt: { [Op.gte]: weekAgo } } })

    const lossRatio     = totalPremium > 0 ? (totalPayout / totalPremium) : 0
    const estimatedOps  = totalPremium * 0.18
    const combinedRatio = totalPremium > 0 ? ((totalPayout + estimatedOps) / totalPremium) : 0

    const claimsByType = await Claim.findAll({
      where:      { submittedAt: { [Op.gte]: weekAgo }, triggerType: { [Op.ne]: null } },
      attributes: ['triggerType', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('amount')), 'total']],
      group:      ['triggerType'],
      raw:        true
    })

    res.json({
      platformMetrics: {
        workersInsured,
        activePolicies,
        totalPremium:    Math.round(totalPremium),
        totalPayout:     Math.round(totalPayout),
        flaggedClaims:   flaggedCount,
        lossRatio:       parseFloat((lossRatio * 100).toFixed(1)),
        combinedRatio:   parseFloat((combinedRatio * 100).toFixed(1)),
        targetLossRatio: 65,
        fraudSavings:    0
      },
      claimsOverview: {
        claimsToday,
        claimsThisWeek,
        totalPayout:  Math.round(totalPayout),
        claimsByType
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Risk zones ────────────────────────────────────────────────────────────────
exports.getRiskZones = async (req, res) => {
  try {
    const riskZones = await RiskZone.findAll()
    res.json(riskZones)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateRiskZone = async (req, res) => {
  try {
    const { location, riskLevel, weatherConditions } = req.body
    const [riskZone] = await RiskZone.upsert({ location, riskLevel, weatherConditions }, { returning: true })
    res.json(riskZone)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Fraud alerts — uses mlService (same as claimController) for consistency ──
exports.getFraudAlerts = async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const recentClaims = await Claim.findAll({
      where:   { submittedAt: { [Op.gte]: weekAgo } },
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
    })

    // Group by user
    const byUser = {}
    recentClaims.forEach(c => {
      if (!byUser[c.userId]) byUser[c.userId] = []
      byUser[c.userId].push(c)
    })

    const fraudAlerts = []

    for (const [userId, claims] of Object.entries(byUser)) {
      const latestClaim = claims[0]
      const policy = await Policy.findOne({ where: { userId, status: 'active' } })
      if (!policy) continue

      // Use same getFraudAssessment as claimController for consistent scoring
      const fraudResult = await getFraudAssessment({
        amount:           parseFloat(latestClaim.amount),
        policyCoverage:   parseFloat(policy.coverage),
        claimCount30Days: claims.length
      })

      if (fraudResult.riskScore > 0) {
        fraudAlerts.push({
          id:         `fraud-${userId}-${Date.now()}`,
          userId,
          userName:   latestClaim.user?.name,
          claimCount: claims.length,
          riskScore:  fraudResult.riskScore,
          severity:   fraudResult.riskScore > 50 ? 'high' : fraudResult.riskScore > 20 ? 'medium' : 'low',
          type:       fraudResult.isFraudulent ? 'Suspicious pattern detected' : 'Elevated risk score',
          reasons:    fraudResult.reasons,
          details:    `${claims.length} claims in last 7 days`
        })
      }
    }

    fraudAlerts.sort((a, b) => b.riskScore - a.riskScore)
    res.json(fraudAlerts)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── All workers with policies (paginated) ─────────────────────────────────────
exports.getAllWorkers = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1)
    const limit  = Math.min(100, parseInt(req.query.limit) || 20)
    const offset = (page - 1) * limit

    const { count, rows } = await User.findAndCountAll({
      where:      { role: 'worker' },
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] },
      include:    [{ model: Policy, as: 'policies', where: { status: 'active' }, required: false }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    })

    res.json({ workers: rows, total: count, page, totalPages: Math.ceil(count / limit) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Background job admin handlers moved to routes/admin/jobs.js
// (mounted at /api/admin/jobs/*)

// ── Reserve health (solvency snapshot + recent ledger) ───────────────────────

/**
 * GET /api/admin/reserves
 * Returns current solvency ratio, pool breakdown, threshold bands, and the
 * 20 most recent ledger entries for the admin dashboard.
 */
exports.getReserveHealth = async (req, res) => {
  try {
    const snap = await reserveService.getSolvencySnapshot()

    const recentEntries = await Reserve.findAll({
      order: [['created_at', 'DESC']],
      limit: 20,
      raw:   true
    })

    // Derive band for UI colouring (matches thresholds in reserveService)
    const { THRESHOLDS } = reserveService
    let band = 'healthy'
    if (Number.isFinite(snap.ratio)) {
      if      (snap.ratio < THRESHOLDS.CRITICAL_RATIO)   band = 'critical'
      else if (snap.ratio < THRESHOLDS.LOW_ALERT_RATIO)  band = 'low'
      else if (snap.ratio < THRESHOLDS.PAYOUT_MIN_RATIO) band = 'warn'
    }

    res.json({
      snapshot: {
        ...snap,
        // Number.POSITIVE_INFINITY → null on the wire (JSON can't encode Infinity)
        ratio: Number.isFinite(snap.ratio) ? snap.ratio : null
      },
      band,
      thresholds:         THRESHOLDS,
      policySalesHalted:  Number.isFinite(snap.ratio) && snap.ratio < THRESHOLDS.CRITICAL_RATIO,
      payoutsBlocked:     Number.isFinite(snap.ratio) && snap.ratio < THRESHOLDS.PAYOUT_MIN_RATIO,
      recentEntries
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Policy reactivation (admin-initiated un-suspend) ─────────────────────────

/**
 * POST /api/admin/policies/:id/reactivate
 * Atomic un-suspension of a policy frozen by the premium-collection retry
 * logic. Resets both lifecycle and money-health fields so the next 6 AM
 * collection run treats it like a healthy policy.
 *
 * Fails with 409 if the policy isn't in a reactivatable state (only
 * 'suspended' is eligible — 'cancelled' and 'expired' are terminal).
 */
exports.reactivatePolicy = async (req, res) => {
  try {
    const policyId = parseInt(req.params.id)
    if (!Number.isFinite(policyId) || policyId <= 0) {
      return res.status(400).json({ message: 'Invalid policy id' })
    }

    const policy = await Policy.findByPk(policyId)
    if (!policy) return res.status(404).json({ message: 'Policy not found' })

    // Only suspended policies can be reactivated. A 'paused' policy is worker-
    // controlled (admin can't force-resume it). Terminal states ('cancelled',
    // 'expired') require creating a new policy, not reactivation.
    if (policy.status !== 'suspended') {
      return res.status(409).json({
        message: `Policy is not suspended (current status: ${policy.status}). Only suspended policies can be reactivated.`
      })
    }

    // Atomic: all three premium-collection fields reset together so the next
    // daily run sees a clean state.
    await policy.update({
      status:                    'active',
      premium_collection_status: 'active',
      consecutive_failures:      0
    })

    // Tell the worker their coverage is back
    try {
      await createNotification({
        userId:  policy.userId,
        type:    'policy_reactivated',
        title:   'Coverage restored',
        message: `Your GigShield coverage has been reactivated by our team. Daily premium collection will resume.`,
        data:    { policyId: policy.id, reactivatedBy: 'admin', adminId: req.user.id }
      })
    } catch (err) {
      console.error(`[adminController] Failed to notify worker of reactivation:`, err.message)
    }

    // Refresh materialized balance so dashboards show the new state immediately
    try {
      await recomputeBalance(policy.userId)
    } catch (err) {
      console.error(`[adminController] Balance recompute failed after reactivation:`, err.message)
    }

    res.json({
      success: true,
      message: 'Policy reactivated',
      policy:  await Policy.findByPk(policyId)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Claim labelling (Phase 5: supervised training set) ───────────────────────
// ClaimLabel is append-only — every label is a new row. Older rows stay for
// audit; the latest row is the "current" verdict. Each insert also appends
// a line to Claim.notes so the audit trail is visible next to the claim.
exports.setClaimLabel = async (req, res) => {
  try {
    const claimId = parseInt(req.params.id, 10)
    const { label, reason } = req.body

    if (!claimId) return res.status(400).json({ message: 'claim id required' })
    if (!CLAIM_LABEL_VALUES.includes(label)) {
      return res.status(400).json({ message: `label must be one of: ${CLAIM_LABEL_VALUES.join(', ')}` })
    }

    const claim = await Claim.findByPk(claimId)
    if (!claim) return res.status(404).json({ message: 'Claim not found' })

    const entry = await ClaimLabel.create({
      claim_id: claimId,
      label,
      admin_id: req.user.id,
      reason:   reason ? String(reason).slice(0, 2000) : null
    })

    await claim.update({
      notes: `${claim.notes || ''}\n[${entry.created_at.toISOString()}] Labeled as ${label.toUpperCase()} by admin ${req.user.id}${reason ? ` — ${reason}` : ''}`.trim()
    })

    res.json({
      success: true,
      label: {
        id:         entry.id,
        claim_id:   entry.claim_id,
        label:      entry.label,
        reason:     entry.reason,
        admin_id:   entry.admin_id,
        created_at: entry.created_at
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── GET /api/admin/claims/labeling ──────────────────────────────────────────
// Returns the queue of claims awaiting admin review + their signals.
// Filters:
//   ?verdict=REVIEW,BLOCK          — decision_verdict whitelist (CSV)
//   ?minRiskScore=50               — filter to fraud riskScore ≥ N
//   ?limit=100                     — cap rows (default 100, max 500)
//   ?unlabeledOnly=true            — hide claims that already have any ClaimLabel
// Always sorted: unlabeled first (null labels), then newest labeled claim first.
exports.getClaimsForLabeling = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500)
    const unlabeledOnly = req.query.unlabeledOnly === 'true'
    const minRiskScore = req.query.minRiskScore != null
      ? parseFloat(req.query.minRiskScore)
      : null

    const where = {}
    if (req.query.verdict) {
      const verdicts = String(req.query.verdict)
        .split(',')
        .map(v => v.trim().toUpperCase())
        .filter(v => ['AUTO', 'REVIEW', 'BLOCK'].includes(v))
      if (verdicts.length) where.decision_verdict = { [Op.in]: verdicts }
    }

    const claims = await Claim.findAll({
      where,
      order: [['submittedAt', 'DESC']],
      limit,
      attributes: [
        'id', 'userId', 'amount', 'triggerType', 'status', 'payout_status',
        'submittedAt', 'decision_verdict', 'decision_reasons', 'createdAt'
      ]
    })
    if (claims.length === 0) return res.json({ total: 0, rows: [] })

    const claimIds = claims.map(c => c.id)

    // Fetch all ClaimLabel rows for these claims, then keep the latest per claim
    const labelRows = await ClaimLabel.findAll({
      where: { claim_id: { [Op.in]: claimIds } },
      order: [['claim_id', 'ASC'], ['created_at', 'DESC']],
      attributes: ['claim_id', 'label', 'reason', 'admin_id', 'created_at']
    })
    const latestLabel = new Map()
    for (const r of labelRows) {
      if (!latestLabel.has(r.claim_id)) latestLabel.set(r.claim_id, r)
    }

    // Join latest behavior score per user, point-in-time to the claim.
    const userIds = [...new Set(claims.map(c => c.userId))]
    const latestScore = new Map()
    for (const uid of userIds) {
      const s = await UserScore.findOne({
        where:      { user_id: uid },
        order:      [['scored_at', 'DESC']],
        attributes: ['behavior_score', 'scored_at']
      })
      if (s) latestScore.set(uid, s)
    }

    let rows = claims.map(c => {
      const fraud  = c.decision_reasons?.checks?.fraud || {}
      const label  = latestLabel.get(c.id)
      const score  = latestScore.get(c.userId)
      return {
        claimId:         c.id,
        userId:          c.userId,
        amount:          parseFloat(c.amount),
        triggerType:     c.triggerType,
        status:          c.status,
        payout_status:   c.payout_status,
        riskScore:       fraud.riskScore ?? null,
        fraudFlags:      Array.isArray(fraud.reasons) ? fraud.reasons : [],
        behaviorScore:   score?.behavior_score ?? null,
        decision_verdict: c.decision_verdict ?? null,
        createdAt:       c.createdAt,
        submittedAt:     c.submittedAt,
        currentLabel:    label
          ? { label: label.label, reason: label.reason, admin_id: label.admin_id, created_at: label.created_at }
          : null,
        labelCount:      labelRows.filter(l => l.claim_id === c.id).length
      }
    })

    if (unlabeledOnly) {
      rows = rows.filter(r => !r.currentLabel)
    }
    if (minRiskScore != null) {
      rows = rows.filter(r => (r.riskScore ?? 0) >= minRiskScore)
    }

    // Unlabeled first, then newest-submitted. Stable.
    rows.sort((a, b) => {
      const aU = a.currentLabel ? 1 : 0
      const bU = b.currentLabel ? 1 : 0
      if (aU !== bU) return aU - bU
      return new Date(b.submittedAt) - new Date(a.submittedAt)
    })

    res.json({ total: rows.length, rows })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── GET /api/admin/claims/label-stats ───────────────────────────────────────
// Distribution across the latest label per claim. Unlabeled claims are
// counted as `unlabeled` for dashboard clarity.
exports.getLabelStats = async (req, res) => {
  try {
    const labelRows = await ClaimLabel.findAll({
      order: [['claim_id', 'ASC'], ['created_at', 'DESC']],
      attributes: ['claim_id', 'label'],
      raw: true
    })

    const latest = new Map()
    for (const r of labelRows) {
      if (!latest.has(r.claim_id)) latest.set(r.claim_id, r.label)
    }

    const totalClaims = await Claim.count()
    const counts = { legit: 0, fraud: 0, uncertain: 0 }
    for (const lbl of latest.values()) counts[lbl]++

    const totalLabeled = counts.legit + counts.fraud + counts.uncertain
    const fraudPct = totalLabeled > 0 ? (counts.fraud / totalLabeled) * 100 : 0
    const READY_FOR_TRAINING_THRESHOLD = 500

    res.json({
      totalClaims,
      totalLabeled,
      unlabeled:        Math.max(0, totalClaims - totalLabeled),
      counts,
      fraudPct:         Math.round(fraudPct * 10) / 10,
      readyForTraining: totalLabeled >= READY_FOR_TRAINING_THRESHOLD,
      trainingThreshold: READY_FOR_TRAINING_THRESHOLD
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Training-data export (Phase 5) ───────────────────────────────────────────
// Joins each claim with the UserScore that was current at submission time.
// Use `?onlyLabeled=true` when training — unlabeled rows are unusable as
// supervised signal (they're still returned by default so reviewers can see
// the full backlog).
exports.getTrainingData = async (req, res) => {
  try {
    const onlyLabeled = req.query.onlyLabeled === 'true'
    const limit       = Math.min(parseInt(req.query.limit, 10) || 1000, 10000)
    const since       = req.query.since ? new Date(req.query.since) : null
    if (since && Number.isNaN(since.getTime())) {
      return res.status(400).json({ message: 'since must be an ISO-8601 timestamp' })
    }

    const rows = await buildDataset({ onlyLabeled, limit, since })

    // Small summary so reviewers can see label distribution at a glance.
    const counts = rows.reduce((acc, r) => {
      acc[r.label] = (acc[r.label] || 0) + 1
      return acc
    }, {})

    res.json({
      generatedAt: new Date().toISOString(),
      totalRows:   rows.length,
      labelCounts: counts,
      rows
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
