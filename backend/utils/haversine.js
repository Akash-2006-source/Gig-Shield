/**
 * haversine.js
 * ------------
 * Great-circle distance between two lat/lng points, in meters.
 * Pure, stateless — safe to call from anywhere.
 */

const EARTH_RADIUS_M = 6371000

function toRad(deg) { return deg * Math.PI / 180 }

/**
 * @param {number} lat1 degrees
 * @param {number} lng1 degrees
 * @param {number} lat2 degrees
 * @param {number} lng2 degrees
 * @returns {number} distance in meters
 */
function distanceMeters(lat1, lng1, lat2, lng2) {
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lng2 - lng1)

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_M * c
}

module.exports = { distanceMeters }
