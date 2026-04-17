import { useEffect, useRef } from 'react'
import { postBehaviorEvent } from '../services/behaviorService'

/**
 * useBehaviorSampler
 * ------------------
 * Feeds the backend /api/behavior/ingest endpoint. Layered on top of
 * useLocationTracker (which polls GPS every 60s) — this hook decides when
 * the sampled location actually gets POSTed.
 *
 * Cadence:
 *   active (tab visible AND recent movement)  → send every change that's > dedupMeters
 *   idle   (tab hidden OR stationary ≥ 2 polls) → send every ~5 minutes regardless
 *
 * Client-side dedup (defense-in-depth before the server's own dedup):
 *   - skip if lat/lng null
 *   - skip if <DEDUP_METERS from last sent position AND <MIN_INTERVAL_MS elapsed
 *
 * @param {object} params
 * @param {{lat,lng,accuracy,timestamp}|null} params.location  from useLocationTracker
 * @param {boolean} params.enabled                              master on/off
 */

const DEDUP_METERS      = 10
const MIN_INTERVAL_MS   = 55 * 1000        // floor between any two posts (under-shoots the 60s poll slightly)
const IDLE_INTERVAL_MS  = 5 * 60 * 1000    // when idle, post at most every 5 min
const IDLE_POLL_COUNT   = 2                // two consecutive near-identical samples → idle

function toRad(d) { return d * Math.PI / 180 }
function distanceMeters(a, b) {
  if (!a || !b) return Infinity
  const R = 6371000
  const φ1 = toRad(a.lat), φ2 = toRad(b.lat)
  const Δφ = toRad(b.lat - a.lat)
  const Δλ = toRad(b.lng - a.lng)
  const h  = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function useBehaviorSampler({ location, enabled }) {
  const lastSentRef  = useRef(null)       // { lat, lng, at: ms }
  const stationaryRef = useRef(0)          // count of consecutive near-identical polls

  useEffect(() => {
    if (!enabled) return
    if (!location || location.lat == null || location.lng == null) return

    const now = Date.now()
    const last = lastSentRef.current
    const distFromLast = last ? distanceMeters(last, location) : Infinity

    // Track stationary streak so we can switch to idle cadence.
    if (distFromLast < DEDUP_METERS) {
      stationaryRef.current += 1
    } else {
      stationaryRef.current = 0
    }

    const tabHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
    const idle      = tabHidden || stationaryRef.current >= IDLE_POLL_COUNT

    // Dedup / rate-limit decision
    if (last) {
      const elapsed = now - last.at
      if (elapsed < MIN_INTERVAL_MS) return           // just sent — skip
      if (distFromLast < DEDUP_METERS && elapsed < IDLE_INTERVAL_MS) {
        // Same spot, and we're still within the idle window — skip
        if (idle) return
        if (elapsed < MIN_INTERVAL_MS * 3) return     // active but stationary: back off gently
      }
    }

    const payload = {
      event_type:  'location_ping',
      occurred_at: (location.timestamp instanceof Date
                      ? location.timestamp.toISOString()
                      : new Date().toISOString()),
      lat:         location.lat,
      lng:         location.lng,
      accuracy_m:  location.accuracy ? parseFloat(location.accuracy) : null,
      idle_seconds: idle ? Math.round((last ? (now - last.at) : 0) / 1000) : 0,
      metadata:    {
        tab_hidden:        tabHidden,
        stationary_polls:  stationaryRef.current
      }
    }

    postBehaviorEvent(payload).then(res => {
      if (res.ok) {
        lastSentRef.current = { lat: location.lat, lng: location.lng, at: now }
      }
    })
  }, [location, enabled])
}
