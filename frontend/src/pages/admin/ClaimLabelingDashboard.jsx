import React, { useCallback, useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import {
  fetchClaimsForLabeling,
  fetchLabelStats,
  submitLabel
} from '../../services/adminLabelingService'
import '../../styles/dashboard.css'

const LABELS = [
  { key: 'legit',     text: '✅ Legit',     className: 'action-btn',        color: '#16a34a' },
  { key: 'fraud',     text: '🚫 Fraud',     className: 'action-btn cancel', color: '#dc2626' },
  { key: 'uncertain', text: '⚠️ Uncertain', className: 'action-btn',        color: '#d97706' }
]

const ClaimLabelingDashboard = () => {
  const [rows, setRows]         = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [busyId, setBusyId]     = useState(null)
  const [filters, setFilters]   = useState({
    verdict:       '',
    minRiskScore:  '',
    unlabeledOnly: true
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [queueRes, statRes] = await Promise.all([
        fetchClaimsForLabeling({
          verdict:       filters.verdict || undefined,
          minRiskScore:  filters.minRiskScore || undefined,
          unlabeledOnly: filters.unlabeledOnly
        }),
        fetchLabelStats()
      ])
      setRows(queueRes.rows || [])
      setStats(statRes)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load labeling queue')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { refresh() }, [refresh])

  const handleLabel = async (claimId, labelKey) => {
    // Optional reason prompt; cancel = cancel the whole action.
    const reason = window.prompt(`Optional reason for marking as ${labelKey.toUpperCase()} (blank to skip, cancel to abort):`, '')
    if (reason === null) return
    setBusyId(claimId)
    try {
      await submitLabel(claimId, labelKey, reason || undefined)
      await refresh()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Label submission failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Claim Labeling Dashboard</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '-0.5rem' }}>
          Append-only training data for the fraud / behavior ML model. Every label is audit-logged.
        </p>

        {/* ── Summary panel ─────────────────────────────────────────────── */}
        {stats && (
          <section className="dashboard-section">
            <div className="info-card" style={{ background: '#f8fafc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <Stat label="Total claims"    value={stats.totalClaims} />
                <Stat label="Labeled"         value={stats.totalLabeled} />
                <Stat label="Unlabeled"       value={stats.unlabeled} />
                <Stat label="Fraud %"         value={`${stats.fraudPct}%`} />
                <Stat label="Legit"           value={stats.counts.legit} />
                <Stat label="Fraud"           value={stats.counts.fraud} />
                <Stat label="Uncertain"       value={stats.counts.uncertain} />
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 8,
                            background: stats.readyForTraining ? '#d1fae5' : '#fef3c7',
                            color: stats.readyForTraining ? '#065f46' : '#92400e',
                            fontWeight: 600 }}>
                {stats.readyForTraining
                  ? `✅ Ready for ML training (${stats.totalLabeled} ≥ ${stats.trainingThreshold})`
                  : `⏳ ${stats.totalLabeled} / ${stats.trainingThreshold} labels collected — keep labeling before training`}
              </div>
            </div>
          </section>
        )}

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <section className="dashboard-section">
          <div className="info-card">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500 }}>Verdict</label>
                <select value={filters.verdict}
                        onChange={e => setFilters({ ...filters, verdict: e.target.value })}>
                  <option value="">any</option>
                  <option value="AUTO">AUTO</option>
                  <option value="REVIEW">REVIEW</option>
                  <option value="BLOCK">BLOCK</option>
                  <option value="REVIEW,BLOCK">REVIEW or BLOCK</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500 }}>Min risk score</label>
                <input type="number" min="0" max="100" value={filters.minRiskScore}
                       onChange={e => setFilters({ ...filters, minRiskScore: e.target.value })}
                       placeholder="e.g. 50" style={{ width: 100 }} />
              </div>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={filters.unlabeledOnly}
                       onChange={e => setFilters({ ...filters, unlabeledOnly: e.target.checked })} />
                Unlabeled only
              </label>
              <button className="submit-btn" onClick={refresh} disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* ── Queue table ───────────────────────────────────────────────── */}
        <section className="dashboard-section">
          <div className="table-card">
            <h3>Labeling queue ({rows.length})</h3>
            {loading ? (
              <div className="loading">Loading…</div>
            ) : rows.length === 0 ? (
              <p style={{ color: '#888', padding: '1rem' }}>No claims match the current filters.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Amount</th>
                    <th>Risk</th>
                    <th>Behavior</th>
                    <th>Flags</th>
                    <th>Verdict</th>
                    <th>Current label</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.claimId} style={r.currentLabel ? { opacity: 0.65 } : null}>
                      <td>
                        <div style={{ fontWeight: 600 }}>#{r.claimId}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>user {r.userId}</div>
                      </td>
                      <td>₹{r.amount}</td>
                      <td>{r.riskScore == null ? '—' : r.riskScore}</td>
                      <td>{r.behaviorScore == null ? '—' : r.behaviorScore.toFixed(2)}</td>
                      <td style={{ maxWidth: 220 }}>
                        {r.fraudFlags.length === 0
                          ? <span style={{ color: '#888' }}>—</span>
                          : (
                            <div style={{ fontSize: 11 }}>
                              {r.fraudFlags.slice(0, 2).map((f, i) => <div key={i}>• {f}</div>)}
                              {r.fraudFlags.length > 2 && <div style={{ color: '#888' }}>+{r.fraudFlags.length - 2} more</div>}
                            </div>
                          )}
                      </td>
                      <td><VerdictBadge v={r.decision_verdict} /></td>
                      <td>
                        {r.currentLabel
                          ? (
                            <div style={{ fontSize: 12 }}>
                              <strong style={{ textTransform: 'uppercase' }}>{r.currentLabel.label}</strong>
                              <div style={{ color: '#888' }}>by {r.currentLabel.admin_id} · {r.labelCount} total</div>
                            </div>
                          )
                          : <span style={{ color: '#888' }}>unlabeled</span>
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {LABELS.map(l => (
                            <button key={l.key}
                                    disabled={busyId === r.claimId}
                                    onClick={() => handleLabel(r.claimId, l.key)}
                                    style={{
                                      background: l.color, color: 'white', border: 'none',
                                      padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                                      fontSize: 12, opacity: busyId === r.claimId ? 0.5 : 1
                                    }}>
                              {l.text}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

const Stat = ({ label, value }) => (
  <div className="info-item">
    <span className="label">{label}</span>
    <span className="value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</span>
  </div>
)

const VerdictBadge = ({ v }) => {
  if (!v) return <span style={{ color: '#888' }}>—</span>
  const colors = { AUTO: '#16a34a', REVIEW: '#d97706', BLOCK: '#dc2626' }
  return (
    <span style={{
      background: colors[v] || '#888', color: 'white',
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600
    }}>{v}</span>
  )
}

export default ClaimLabelingDashboard
