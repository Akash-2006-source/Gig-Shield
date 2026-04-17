import api from './api'

export async function fetchClaimsForLabeling(params = {}) {
  const qs = new URLSearchParams()
  if (params.verdict)       qs.set('verdict',       params.verdict)
  if (params.minRiskScore)  qs.set('minRiskScore',  params.minRiskScore)
  if (params.unlabeledOnly) qs.set('unlabeledOnly', 'true')
  if (params.limit)         qs.set('limit',         params.limit)
  const res = await api.get(`/admin/claims/labeling?${qs.toString()}`)
  return res.data
}

export async function fetchLabelStats() {
  const res = await api.get('/admin/claims/label-stats')
  return res.data
}

export async function submitLabel(claimId, label, reason) {
  const res = await api.post(`/admin/claims/${claimId}/label`, { label, reason })
  return res.data
}
