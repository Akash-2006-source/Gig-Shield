import api from './api'

/**
 * Post one behavior event. Returns { ok, deduped, id? }.
 * - 201 → stored  { ok: true, id }
 * - 204 → deduped on the server  { ok: true, deduped: true }
 * - anything else → { ok: false, status }
 * Callers should not retry on failure — the next sample interval will cover it.
 */
export async function postBehaviorEvent(event) {
  try {
    const res = await api.post('/behavior/ingest', event, {
      validateStatus: (s) => s === 201 || s === 204
    })
    return { ok: true, deduped: res.status === 204, id: res.data?.id }
  } catch (err) {
    return { ok: false, status: err.response?.status, error: err.message }
  }
}
