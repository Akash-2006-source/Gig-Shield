/**
 * userScoreService.js
 * -------------------
 * Thin accessor around UserScore. Callers in premium/payout hot paths read
 * from here rather than hitting the model directly, so we can layer caching
 * here later without touching call sites.
 */

const UserScore = require('../models/UserScore')

/**
 * Latest scored row for a user, or null if never scored.
 * Caller decides what "never scored" means (we treat it as neutral in
 * behaviorModifier.modifiersFor).
 */
async function getLatestScore(userId) {
  if (!userId) return null
  return UserScore.findOne({
    where: { user_id: userId },
    order: [['scored_at', 'DESC']],
    attributes: ['behavior_score', 'features', 'scored_at', 'scoring_version']
  })
}

module.exports = { getLatestScore }
