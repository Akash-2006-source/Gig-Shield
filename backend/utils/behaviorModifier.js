/**
 * behaviorModifier.js
 * -------------------
 * Maps a raw behavior_score (0–1) to two bounded multipliers:
 *
 *   premiumMultiplier  — stronger effect. Range [0.90, 1.20].
 *                        Low score = surcharge; high score = discount.
 *
 *   payoutMultiplier   — SOFT effect only. Range [0.85, 1.10].
 *                        Bounded narrow on purpose: reducing a worker's
 *                        payout based on a behavior model carries real legal
 *                        and fairness risk. Score is allowed to nudge the
 *                        amount, never gut it.
 *
 * Neutral pivot at score = 0.7. Below that, we penalise; above, we reward.
 *
 * New users (insufficient_data=true) ALWAYS get 1.0 × 1.0 — no model
 * effect at all until we have signal. "Unknown" ≠ "bad".
 *
 * Pure function, no side effects, no DB.
 */

const PREMIUM_MIN = 0.90
const PREMIUM_MAX = 1.20
const PAYOUT_MIN  = 0.85
const PAYOUT_MAX  = 1.10
const NEUTRAL_SCORE = 0.7

// Linear interpolation between two anchor points.
// At low end of score → hi of multiplier range (risk surcharge).
// At high end of score → lo of multiplier range (discount).
function _interp(score, hiMult, loMult) {
  // Clamp score to [0.3, 1.0] — matches scorer floor/ceil
  const s = Math.max(0.3, Math.min(1.0, score))

  if (s <= NEUTRAL_SCORE) {
    // 0.3 → hiMult, 0.7 → 1.0
    const t = (s - 0.3) / (NEUTRAL_SCORE - 0.3)
    return hiMult + t * (1.0 - hiMult)
  }
  // 0.7 → 1.0, 1.0 → loMult
  const t = (s - NEUTRAL_SCORE) / (1.0 - NEUTRAL_SCORE)
  return 1.0 + t * (loMult - 1.0)
}

/**
 * @param {object} scoreRow  { behavior_score, features: { insufficient_data } }
 * @returns {{premiumMultiplier, payoutMultiplier, neutralised}}
 */
function modifiersFor(scoreRow) {
  if (!scoreRow || scoreRow.features?.insufficient_data) {
    return { premiumMultiplier: 1.0, payoutMultiplier: 1.0, neutralised: true }
  }

  const raw = scoreRow.behavior_score
  if (!Number.isFinite(raw)) {
    return { premiumMultiplier: 1.0, payoutMultiplier: 1.0, neutralised: true }
  }

  return {
    premiumMultiplier: _interp(raw, PREMIUM_MAX, PREMIUM_MIN),
    payoutMultiplier:  _interp(raw, PAYOUT_MIN,  PAYOUT_MAX),
    neutralised:       false
  }
}

module.exports = {
  modifiersFor,
  PREMIUM_MIN,
  PREMIUM_MAX,
  PAYOUT_MIN,
  PAYOUT_MAX,
  NEUTRAL_SCORE
}
