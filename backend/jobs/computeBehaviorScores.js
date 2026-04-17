/**
 * computeBehaviorScores.js
 * ------------------------
 * Nightly rollup: for every user with a policy (active or suspended),
 * pull the last WINDOW_DAYS of BehaviorEvents, compute features, apply
 * the deterministic scoring rules, and append one row to UserScore.
 *
 * Writes are append-only — we never mutate historical scores. Phase 4
 * consumers read "latest score for user X" via (user_id, scored_at DESC).
 *
 * Runs per-user in sequence so a single user's failure doesn't poison
 * the batch. Individual errors are logged but don't abort the job.
 */

const { Op } = require('sequelize')
const BehaviorEvent = require('../models/BehaviorEvent')
const UserScore     = require('../models/UserScore')
const Policy        = require('../models/Policy')
const { computeFeatures } = require('../services/behaviorFeatures')
const { scoreFromFeatures } = require('../services/behaviorScoring')

const WINDOW_DAYS = 7

/**
 * Score one user. Throws → caller logs and moves on.
 */
async function scoreUser(userId, now = new Date()) {
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const events = await BehaviorEvent.findAll({
    where: {
      user_id:     userId,
      occurred_at: { [Op.gte]: since }
    },
    attributes: ['occurred_at', 'lat', 'lng', 'speed_mps', 'idle_seconds'],
    order: [['occurred_at', 'ASC']],
    raw: true
  })

  const features = computeFeatures(events)
  const { behavior_score, reasons, scoring_version } = scoreFromFeatures(features)

  await UserScore.create({
    user_id:         userId,
    scored_at:       now,
    window_days:     WINDOW_DAYS,
    behavior_score,
    features,
    reasons,
    scoring_version
  })

  return { userId, behavior_score, features, reasons }
}

/**
 * Batch entry point — fits the jobScheduler contract
 * (`{ affectedCount, metadata }`).
 */
async function run() {
  const now = new Date()

  // Only score users that actually have a policy — no point scoring ghost accounts.
  const policies = await Policy.findAll({
    where:      { status: { [Op.in]: ['active', 'suspended', 'paused'] } },
    attributes: ['userId']
  })
  const userIds = [...new Set(policies.map(p => p.userId))]

  let scored        = 0
  let failed        = 0
  const scoreCounts = { floor: 0, neutral: 0, reduced: 0 }

  for (const userId of userIds) {
    try {
      const r = await scoreUser(userId, now)
      scored++
      if (r.behavior_score <= 0.3)      scoreCounts.floor++
      else if (r.behavior_score >= 0.99) scoreCounts.neutral++
      else                               scoreCounts.reduced++
    } catch (err) {
      failed++
      console.error(`[computeBehaviorScores] User ${userId} failed:`, err.message)
    }
  }

  const metadata = {
    usersScanned: userIds.length,
    scored,
    failed,
    scoreCounts,
    window_days: WINDOW_DAYS,
    completed_at: now.toISOString()
  }
  console.log('[computeBehaviorScores] Run complete:', metadata)

  return { affectedCount: scored, metadata }
}

module.exports = run
module.exports.scoreUser = scoreUser
module.exports.WINDOW_DAYS = WINDOW_DAYS
