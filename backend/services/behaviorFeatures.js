/**
 * behaviorFeatures.js
 * -------------------
 * Pure feature engine. Takes a list of BehaviorEvent-shaped plain objects
 * covering one user's lookback window; emits a feature bag. No DB access,
 * no side effects — trivially testable and cacheable.
 *
 * Features emitted:
 *   total_events        raw count
 *   active_days         distinct calendar days with ≥1 event
 *   active_hours_avg    average distinct hours-of-day per active day
 *   distance_km_total   sum of haversine segments between consecutive GPS points
 *   idle_fraction       share of events whose idle_seconds ≥ IDLE_THRESHOLD
 *   avg_speed_mps       mean of non-null speed readings
 *   consistency_score   1 - coefficient of variation of daily event counts;
 *                       0 if only one active day or std dev 0
 *   insufficient_data   true when there's not enough signal to score fairly
 */

const { distanceMeters } = require('../utils/haversine')

const IDLE_SECONDS_THRESHOLD = 300          // 5 min — "idle" by client report
const MIN_EVENTS_FOR_SCORING = 5            // below this, features.insufficient_data=true
const MIN_ACTIVE_DAYS_FOR_CONSISTENCY = 2

function dayKey(date) {
  const d = new Date(date)
  return d.toISOString().slice(0, 10)  // YYYY-MM-DD UTC; good enough for rollup
}

function hourKey(date) {
  const d = new Date(date)
  return `${dayKey(date)}#${d.getUTCHours()}`
}

function mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((s, x) => s + x, 0) / arr.length
}

function stdDev(arr) {
  if (arr.length < 2) return 0
  const m = mean(arr)
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length
  return Math.sqrt(v)
}

/**
 * @param {Array} events list of event rows; each must have occurred_at and optional lat/lng/speed_mps/idle_seconds
 * @returns {object} feature bag
 */
function computeFeatures(events = []) {
  const total = events.length

  if (total === 0) {
    return {
      total_events:       0,
      active_days:        0,
      active_hours_avg:   0,
      distance_km_total:  0,
      idle_fraction:      0,
      avg_speed_mps:      0,
      consistency_score:  0,
      insufficient_data:  true
    }
  }

  // Sort chronologically once — needed for distance calc.
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  )

  // ── Day + hour rollups ────────────────────────────────────────────────────
  const dayCounts    = new Map()   // dayKey → event count
  const dayHoursSets = new Map()   // dayKey → Set of distinct hour buckets

  for (const ev of sorted) {
    const d = dayKey(ev.occurred_at)
    dayCounts.set(d, (dayCounts.get(d) || 0) + 1)

    if (!dayHoursSets.has(d)) dayHoursSets.set(d, new Set())
    dayHoursSets.get(d).add(hourKey(ev.occurred_at))
  }

  const active_days = dayCounts.size
  const dailyCounts = [...dayCounts.values()]
  const active_hours_avg = mean([...dayHoursSets.values()].map(s => s.size))

  // ── Distance travelled ────────────────────────────────────────────────────
  let distanceMetersTotal = 0
  let prev = null
  for (const ev of sorted) {
    if (ev.lat != null && ev.lng != null) {
      if (prev) {
        distanceMetersTotal += distanceMeters(prev.lat, prev.lng, ev.lat, ev.lng)
      }
      prev = { lat: ev.lat, lng: ev.lng }
    }
  }
  const distance_km_total = distanceMetersTotal / 1000

  // ── Idle fraction ─────────────────────────────────────────────────────────
  const idleCount = sorted.filter(e => (e.idle_seconds || 0) >= IDLE_SECONDS_THRESHOLD).length
  const idle_fraction = total === 0 ? 0 : idleCount / total

  // ── Average speed ─────────────────────────────────────────────────────────
  const speeds = sorted
    .map(e => (typeof e.speed_mps === 'number' && !isNaN(e.speed_mps) ? e.speed_mps : null))
    .filter(s => s !== null)
  const avg_speed_mps = speeds.length ? mean(speeds) : 0

  // ── Consistency: inverse coefficient of variation of daily counts ─────────
  let consistency_score = 0
  if (active_days >= MIN_ACTIVE_DAYS_FOR_CONSISTENCY) {
    const m  = mean(dailyCounts)
    const sd = stdDev(dailyCounts)
    if (m > 0) {
      const cv = sd / m
      consistency_score = Math.max(0, Math.min(1, 1 - cv))
    }
  }

  return {
    total_events:       total,
    active_days,
    active_hours_avg,
    distance_km_total,
    idle_fraction,
    avg_speed_mps,
    consistency_score,
    insufficient_data:  total < MIN_EVENTS_FOR_SCORING
  }
}

module.exports = {
  computeFeatures,
  IDLE_SECONDS_THRESHOLD,
  MIN_EVENTS_FOR_SCORING
}
