/**
 * trainingDataService.js
 * ----------------------
 * Builds the supervised training set for the behavior/fraud model.
 *
 * One row per claim:
 *   (features captured at submission time) → (label assigned post-hoc by admin)
 *
 * Feature join rule:
 *   For each claim, pick the UserScore row with scored_at ≤ claim.submittedAt
 *   for the same user. That's the score the system effectively USED to gate
 *   this claim, so it's the correct input for training a replacement model.
 *
 *   Claims submitted before the user's first scoring run get features=null
 *   and insufficient_data=true — still useful as "cold-start" rows.
 *
 * Output is JSON (one record per claim). CSV export can be layered on top
 * if/when we start batch-training outside the Node process.
 */

const { Op } = require('sequelize')
const Claim      = require('../models/Claim')
const UserScore  = require('../models/UserScore')
const ClaimLabel = require('../models/ClaimLabel')

// Legacy label values on Claim.label — kept for buildDataset() backwards compat.
const LABEL_VALUES = Object.freeze(['unlabeled', 'clean', 'fraud_confirmed', 'false_positive'])

/**
 * Fetch the UserScore row for a user that was "current" at a given timestamp.
 * Returns null if no score existed yet.
 */
async function _scoreAt(userId, ts) {
  return UserScore.findOne({
    where:      { user_id: userId, scored_at: { [Op.lte]: ts } },
    order:      [['scored_at', 'DESC']],
    attributes: ['id', 'behavior_score', 'features', 'scored_at', 'scoring_version']
  })
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.onlyLabeled=false]  skip claims still tagged 'unlabeled'
 * @param {number}  [opts.limit=1000]         cap returned rows
 * @param {Date}    [opts.since]              only claims submittedAt ≥ since
 * @returns {Promise<Array>}
 */
async function buildDataset({ onlyLabeled = false, limit = 1000, since = null } = {}) {
  const where = {}
  if (onlyLabeled) where.label = { [Op.ne]: 'unlabeled' }
  if (since)       where.submittedAt = { [Op.gte]: since }

  const claims = await Claim.findAll({
    where,
    order: [['submittedAt', 'ASC']],
    limit,
    attributes: [
      'id', 'userId', 'policyId', 'amount', 'description', 'status',
      'payout_status', 'triggerType', 'triggerValue', 'isAutoClaim',
      'submittedAt', 'decision_verdict', 'decision_reasons', 'label'
    ]
  })

  const rows = []
  for (const c of claims) {
    const score = await _scoreAt(c.userId, c.submittedAt)
    rows.push({
      claim_id:         c.id,
      user_id:          c.userId,
      policy_id:        c.policyId,
      amount:           parseFloat(c.amount),
      trigger_type:     c.triggerType,
      trigger_value:    c.triggerValue,
      is_auto_claim:    c.isAutoClaim,
      status:           c.status,
      payout_status:    c.payout_status,
      submitted_at:     c.submittedAt,
      decision_verdict: c.decision_verdict,
      // Features that were current when this claim fired — the input row
      features:         score?.features || null,
      behavior_score:   score?.behavior_score ?? null,
      scored_at:        score?.scored_at   || null,
      scoring_version:  score?.scoring_version || null,
      // Ground truth — the model's target
      label:            c.label
    })
  }

  return rows
}

/**
 * Latest ClaimLabel row per claim_id. Older labels on the same claim are
 * discarded here — they stay in the DB for audit, but the training target
 * is whatever the most recent admin verdict says.
 *
 * @param {number[]} claimIds
 * @returns {Promise<Map<number, {label, reason, admin_id, created_at}>>}
 */
async function _latestLabelsFor(claimIds) {
  if (!claimIds.length) return new Map()
  const rows = await ClaimLabel.findAll({
    where: { claim_id: { [Op.in]: claimIds } },
    order: [['claim_id', 'ASC'], ['created_at', 'DESC']],
    attributes: ['claim_id', 'label', 'reason', 'admin_id', 'created_at'],
    raw: true
  })
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.claim_id)) map.set(r.claim_id, r)
  }
  return map
}

/**
 * Supervised training set using the new ClaimLabel history table.
 *
 * Output shape per user spec:
 *   [{ features, label }, ...]
 *
 * where `features` combines:
 *   - UserScore.features at claim submission time (behavior signals)
 *   - claim metadata (amount, trigger, isAutoClaim)
 *   - fraud flags captured in decision_reasons.checks.fraud (if gated)
 *
 * Only claims with AT LEAST ONE ClaimLabel row are returned. Unlabeled
 * claims are unusable for supervised training.
 *
 * @param {object} [opts]
 * @param {number} [opts.limit=10000]
 * @returns {Promise<Array<{features, label, claim_id}>>}
 */
async function getLabeledDataset({ limit = 10000 } = {}) {
  // Pull all labeled claim_ids first — keeps the query cheap.
  const labeledIdsRows = await ClaimLabel.findAll({
    attributes: [[ClaimLabel.sequelize.fn('DISTINCT', ClaimLabel.sequelize.col('claim_id')), 'claim_id']],
    raw: true
  })
  const claimIds = labeledIdsRows.map(r => r.claim_id)
  if (claimIds.length === 0) return []

  const claims = await Claim.findAll({
    where:      { id: { [Op.in]: claimIds } },
    order:      [['submittedAt', 'ASC']],
    limit,
    attributes: [
      'id', 'userId', 'amount', 'triggerType', 'triggerValue',
      'isAutoClaim', 'status', 'payout_status', 'submittedAt',
      'decision_verdict', 'decision_reasons'
    ]
  })

  const latestLabels = await _latestLabelsFor(claims.map(c => c.id))

  const out = []
  for (const c of claims) {
    const score = await UserScore.findOne({
      where:      { user_id: c.userId, scored_at: { [Op.lte]: c.submittedAt } },
      order:      [['scored_at', 'DESC']],
      attributes: ['behavior_score', 'features', 'scored_at', 'scoring_version']
    })

    // Pull fraud signals from the decision-engine audit blob.
    const fraudCheck = c.decision_reasons?.checks?.fraud || {}
    const labelRow   = latestLabels.get(c.id)

    out.push({
      claim_id: c.id,
      features: {
        // Behavior signals (may be null for claims submitted before first scoring run)
        behavior_score:    score?.behavior_score ?? null,
        user_features:     score?.features ?? null,
        scoring_version:   score?.scoring_version ?? null,

        // Claim metadata
        amount:            parseFloat(c.amount),
        trigger_type:      c.triggerType,
        is_auto_claim:     c.isAutoClaim,

        // Fraud signals captured at decision time
        risk_score:        fraudCheck.riskScore ?? null,
        fraud_reasons:     Array.isArray(fraudCheck.reasons) ? fraudCheck.reasons : [],
        decision_verdict:  c.decision_verdict ?? null
      },
      label: labelRow?.label,
      labeled_at: labelRow?.created_at,
      labeled_by: labelRow?.admin_id
    })
  }

  return out
}

module.exports = {
  buildDataset,
  getLabeledDataset,
  LABEL_VALUES
}
