/**
 * behaviorController.js
 * ---------------------
 * Write-only ingest path for behavior events.
 *
 * Dedup strategy (server-side, defense-in-depth):
 *   If the previous event for the same user has the same event_type AND
 *   the new one is <10m away AND <60s later, drop it silently (204).
 *   Clients are expected to do their own sampling (60s active / 3–5min idle)
 *   but a buggy client shouldn't be able to flood our table.
 *
 * Security:
 *   user_id ALWAYS comes from req.user.id — never trust the body.
 *   Rate-limited at the route layer (behaviorLimiter: 60/min/IP).
 */

const BehaviorEvent = require('../models/BehaviorEvent')
const { distanceMeters } = require('../utils/haversine')

// Dedup thresholds — keep these generous so we reject only obvious spam,
// not legitimate close-together pings from a stationary worker.
const DEDUP_DISTANCE_M = 10
const DEDUP_SECONDS    = 60

/**
 * Validate + normalize an incoming event payload.
 * Returns { ok, value, error }.
 */
function parseEvent(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' }
  }

  const eventType = (body.event_type || body.eventType || '').toString().trim()
  if (!eventType) {
    return { ok: false, error: 'event_type is required' }
  }
  if (eventType.length > 32) {
    return { ok: false, error: 'event_type exceeds 32 chars' }
  }

  const occurredRaw = body.occurred_at || body.occurredAt
  const occurredAt  = occurredRaw ? new Date(occurredRaw) : new Date()
  if (Number.isNaN(occurredAt.getTime())) {
    return { ok: false, error: 'occurred_at is not a valid timestamp' }
  }
  // Reject events dated more than 5 minutes in the future (clock tamper)
  if (occurredAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return { ok: false, error: 'occurred_at is too far in the future' }
  }

  const toFloatOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  const toIntOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
  }

  const lat = toFloatOrNull(body.lat ?? body.latitude)
  const lng = toFloatOrNull(body.lng ?? body.longitude)

  if (lat !== null && (lat < -90 || lat > 90)) {
    return { ok: false, error: 'lat out of range' }
  }
  if (lng !== null && (lng < -180 || lng > 180)) {
    return { ok: false, error: 'lng out of range' }
  }

  return {
    ok:    true,
    value: {
      event_type:   eventType,
      occurred_at:  occurredAt,
      lat,
      lng,
      accuracy_m:   toFloatOrNull(body.accuracy_m ?? body.accuracy),
      speed_mps:    toFloatOrNull(body.speed_mps ?? body.speed),
      idle_seconds: toIntOrNull(body.idle_seconds ?? body.idleSeconds),
      metadata:     (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata))
                      ? body.metadata
                      : {}
    }
  }
}

/**
 * Return true if this event should be dropped as a near-duplicate of the
 * user's most recent event. Only triggers when BOTH events carry GPS.
 */
async function isNearDuplicate(userId, candidate) {
  const last = await BehaviorEvent.findOne({
    where: { user_id: userId, event_type: candidate.event_type },
    order: [['occurred_at', 'DESC']],
    attributes: ['lat', 'lng', 'occurred_at']
  })
  if (!last) return false
  if (last.lat == null || last.lng == null || candidate.lat == null || candidate.lng == null) {
    return false
  }

  const ageSec = (candidate.occurred_at.getTime() - new Date(last.occurred_at).getTime()) / 1000
  if (ageSec < 0 || ageSec >= DEDUP_SECONDS) return false

  const d = distanceMeters(last.lat, last.lng, candidate.lat, candidate.lng)
  return d < DEDUP_DISTANCE_M
}

/**
 * POST /api/behavior/ingest
 * Body: single event object — see parseEvent for accepted fields.
 * Responses:
 *   201  event stored
 *   204  dropped as near-duplicate
 *   400  validation error
 */
exports.ingestEvent = async (req, res) => {
  const parsed = parseEvent(req.body)
  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.error })
  }

  const userId = req.user.id
  const candidate = parsed.value

  if (await isNearDuplicate(userId, candidate)) {
    return res.status(204).end()
  }

  const row = await BehaviorEvent.create({
    user_id:      userId,
    event_type:   candidate.event_type,
    occurred_at:  candidate.occurred_at,
    lat:          candidate.lat,
    lng:          candidate.lng,
    accuracy_m:   candidate.accuracy_m,
    speed_mps:    candidate.speed_mps,
    idle_seconds: candidate.idle_seconds,
    metadata:     candidate.metadata
  })

  return res.status(201).json({
    id:          row.id,
    received_at: row.received_at
  })
}
