/**
 * behaviorScoring.js
 * ------------------
 * Deterministic rule-based scoring. No ML. Version-tagged so downstream
 * consumers can detect model drift when we retrain in Phase 5.
 *
 * Score contract:
 *   Range [0.0, 1.0]. 1.0 = full trust / all good. 0.3 floor so a single bad
 *   window doesn't zero-out the user permanently.
 *   New users (insufficient_data) get 1.0 — DO NOT penalize lack of data.
 *
 * Phase 4 applies the spec's clamp (0.85×–1.1×) when mapping this to premium
 * and payout multipliers — that math lives there, not here. This file just
 * produces a raw behavior score.
 */

const SCORING_VERSION = 'v1-rules'
const FLOOR           = 0.3
const CEIL            = 1.0

// Penalty weights — tuned loosely; revisit after a month of live data.
const PENALTY_LOW_ACTIVE_HOURS  = 0.3   // avg <2 distinct hours/day
const PENALTY_STATIONARY        = 0.2   // <1 km total in window
const PENALTY_INCONSISTENT      = 0.15  // consistency_score <0.3
const PENALTY_HEAVY_IDLE        = 0.2   // idle_fraction >0.5

/**
 * @param {object} features  bag from behaviorFeatures.computeFeatures
 * @returns {{behavior_score, reasons, scoring_version}}
 */
function scoreFromFeatures(features = {}) {
  const reasons = []

  if (features.insufficient_data || features.total_events < 5) {
    reasons.push({ code: 'insufficient_data', weight: 0, note: 'Not enough events to score; neutral trust assigned.' })
    return {
      behavior_score:  1.0,
      reasons,
      scoring_version: SCORING_VERSION
    }
  }

  let score = 1.0

  if (features.active_hours_avg < 2) {
    score -= PENALTY_LOW_ACTIVE_HOURS
    reasons.push({
      code:   'low_active_hours',
      weight: -PENALTY_LOW_ACTIVE_HOURS,
      note:   `active_hours_avg=${features.active_hours_avg.toFixed(2)} < 2`
    })
  }

  if (features.distance_km_total < 1) {
    score -= PENALTY_STATIONARY
    reasons.push({
      code:   'stationary',
      weight: -PENALTY_STATIONARY,
      note:   `distance_km_total=${features.distance_km_total.toFixed(2)} < 1`
    })
  }

  if (features.consistency_score < 0.3) {
    score -= PENALTY_INCONSISTENT
    reasons.push({
      code:   'inconsistent_activity',
      weight: -PENALTY_INCONSISTENT,
      note:   `consistency_score=${features.consistency_score.toFixed(2)} < 0.3`
    })
  }

  if (features.idle_fraction > 0.5) {
    score -= PENALTY_HEAVY_IDLE
    reasons.push({
      code:   'heavy_idle',
      weight: -PENALTY_HEAVY_IDLE,
      note:   `idle_fraction=${features.idle_fraction.toFixed(2)} > 0.5`
    })
  }

  score = Math.max(FLOOR, Math.min(CEIL, score))

  return {
    behavior_score:  score,
    reasons,
    scoring_version: SCORING_VERSION
  }
}

module.exports = {
  scoreFromFeatures,
  SCORING_VERSION,
  FLOOR,
  CEIL
}
