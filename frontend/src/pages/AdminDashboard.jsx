import React, { useState, useEffect, useCallback } from 'react'
import Navbar    from '../components/Navbar'
import StatCard  from '../components/StatCard'
import '../styles/dashboard.css'
import {
  getDashboardStats, getRiskZones, getFraudAlerts,
  getAllClaims, getFlaggedClaims, updateClaimStatus
} from '../services/adminService'

const AdminDashboard = () => {
  const [metrics,       setMetrics]       = useState({ workersInsured:0, activePolicies:0, totalPremium:0, totalPayout:0, lossRatio:0, combinedRatio:0, targetLossRatio:65, flaggedClaims:0 })
  const [claimsOverview,setClaimsOverview]= useState({ claimsToday:0, claimsThisWeek:0, totalPayout:0 })
  const [fraudAlerts,   setFraudAlerts]   = useState([])
  const [riskZones,     setRiskZones]     = useState([])
  const [claims,        setClaims]        = useState([])
  const [claimPage,     setClaimPage]     = useState(1)
  const [claimTotal,    setClaimTotal]    = useState(0)
  const [claimFilter,   setClaimFilter]   = useState('all')   // 'all' | 'flagged'
  const [actionLoading, setActionLoading] = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)

  const fetchClaims = useCallback(async (page = 1, filter = 'all') => {
    try {
      const res = filter === 'flagged'
        ? await getFlaggedClaims(page)
        : await getAllClaims(page)
      setClaims(res.claims || [])
      setClaimTotal(res.pagination?.total || 0)
    } catch { /* silent — main load already shows error if needed */ }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [stats, zones, fraud] = await Promise.all([
          getDashboardStats(), getRiskZones(), getFraudAlerts()
        ])
        setMetrics(stats.platformMetrics)
        setClaimsOverview(stats.claimsOverview)
        setRiskZones(zones)
        setFraudAlerts(fraud)
        await fetchClaims(1, 'all')
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [fetchClaims])

  const handleFilterChange = (f) => {
    setClaimFilter(f)
    setClaimPage(1)
    fetchClaims(1, f)
  }

  const handleClaimAction = async (claimId, status) => {
    const notes = status === 'rejected'
      ? window.prompt('Reason for rejection (shown to worker):') ?? ''
      : ''
    if (status === 'rejected' && notes === null) return // cancelled prompt
    try {
      setActionLoading(claimId)
      await updateClaimStatus(claimId, status, notes)
      fetchClaims(claimPage, claimFilter)
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePageChange = (p) => {
    setClaimPage(p)
    fetchClaims(p, claimFilter)
  }

  if (loading) return (
    <div className="dashboard-container"><Navbar />
      <div className="dashboard-content"><div className="loading">Loading dashboard...</div></div>
    </div>
  )
  if (error) return (
    <div className="dashboard-container"><Navbar />
      <div className="dashboard-content"><div className="error">{error}</div></div>
    </div>
  )

  const lrColor = metrics.lossRatio > 80 ? '#e74c3c' : metrics.lossRatio > 65 ? '#f39c12' : '#27ae60'

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Admin Dashboard</h2>

        {/* Platform Metrics */}
        <section className="dashboard-section">
          <h3>Platform Metrics</h3>
          <div className="stats-grid">
            <StatCard title="Workers Insured"         value={metrics.workersInsured}                       icon="👥" />
            <StatCard title="Active Policies"         value={metrics.activePolicies}                       icon="📋" />
            <StatCard title="Total Premium Collected" value={`₹${metrics.totalPremium.toLocaleString()}`}  icon="💰" />
            <StatCard title="Total Payout"            value={`₹${metrics.totalPayout.toLocaleString()}`}   icon="💸" />
          </div>
        </section>

        {/* Actuarial Metrics */}
        <section className="dashboard-section">
          <h3>Actuarial Health</h3>
          <div className="info-card">
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Loss Ratio</span>
                <span className="value" style={{ color: lrColor, fontWeight: 700 }}>
                  {metrics.lossRatio}%
                </span>
              </div>
              <div className="info-item">
                <span className="label">Combined Ratio</span>
                <span className="value">{metrics.combinedRatio}%</span>
              </div>
              <div className="info-item">
                <span className="label">Target Loss Ratio</span>
                <span className="value">{metrics.targetLossRatio}%</span>
              </div>
              <div className="info-item">
                <span className="label">Flagged Claims</span>
                <span className="value" style={{ color: metrics.flaggedClaims > 0 ? '#e74c3c' : 'inherit' }}>
                  {metrics.flaggedClaims}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Claims Today</span>
                <span className="value">{claimsOverview.claimsToday}</span>
              </div>
              <div className="info-item">
                <span className="label">Claims This Week</span>
                <span className="value">{claimsOverview.claimsThisWeek}</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '0.75rem' }}>
              Target loss ratio: 63–68%. Above 80% is a loss-making position.
            </p>
          </div>
        </section>

        {/* Claims Management */}
        <section className="dashboard-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Claims Management</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'flagged'].map(f => (
                <button key={f} onClick={() => handleFilterChange(f)}
                  style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                    border: '1px solid var(--color-border-secondary)',
                    background: claimFilter === f ? 'var(--color-text-primary)' : 'transparent',
                    color: claimFilter === f ? 'var(--color-background-primary)' : 'var(--color-text-secondary)'
                  }}>
                  {f === 'all' ? `All (${claimTotal})` : `Flagged (${metrics.flaggedClaims})`}
                </button>
              ))}
            </div>
          </div>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Worker</th><th>Trigger / Type</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: '#888', padding: '1.5rem' }}>No claims found.</td></tr>
                ) : claims.map(claim => (
                  <tr key={claim.id}>
                    <td style={{ fontSize: '12px', color: '#888' }}>#{claim.id}</td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{claim.user?.name || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{claim.user?.email}</div>
                    </td>
                    <td style={{ fontSize: '12px', maxWidth: '180px' }}>
                      <div style={{ fontWeight: 500 }}>{claim.triggerType || 'Manual'}</div>
                      <div style={{ color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {claim.description?.slice(0, 60)}{claim.description?.length > 60 ? '…' : ''}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{Number(claim.amount).toLocaleString()}</td>
                    <td style={{ fontSize: '12px', color: '#888' }}>
                      {new Date(claim.submittedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <span className={`status-badge ${claim.status?.toLowerCase()}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td>
                      {(claim.status === 'pending' || claim.status === 'flagged') ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="action-btn activate"
                            style={{ padding: '3px 10px', fontSize: '12px' }}
                            disabled={actionLoading === claim.id}
                            onClick={() => handleClaimAction(claim.id, 'approved')}>
                            {actionLoading === claim.id ? '…' : '✓'}
                          </button>
                          <button className="action-btn cancel"
                            style={{ padding: '3px 10px', fontSize: '12px' }}
                            disabled={actionLoading === claim.id}
                            onClick={() => handleClaimAction(claim.id, 'rejected')}>
                            {actionLoading === claim.id ? '…' : '✕'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#aaa' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {claimTotal > 20 && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '0.75rem', borderTop: '1px solid var(--color-border-tertiary)' }}>
                <button disabled={claimPage === 1} onClick={() => handlePageChange(claimPage - 1)}
                  style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-primary)' }}>
                  ← Prev
                </button>
                <span style={{ fontSize: '12px', color: '#888', alignSelf: 'center' }}>
                  Page {claimPage} of {Math.ceil(claimTotal / 20)}
                </span>
                <button disabled={claimPage >= Math.ceil(claimTotal / 20)} onClick={() => handlePageChange(claimPage + 1)}
                  style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', border: '1px solid var(--color-border-secondary)', background: 'transparent', color: 'var(--color-text-primary)' }}>
                  Next →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Fraud Alerts */}
        <section className="dashboard-section">
          <h3>Fraud Detection Alerts</h3>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr><th>Worker</th><th>Claims (7d)</th><th>Risk Score</th><th>Severity</th><th>Reasons</th></tr>
              </thead>
              <tbody>
                {fraudAlerts.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: '#888', padding: '1.5rem' }}>No fraud alerts this week.</td></tr>
                ) : fraudAlerts.map(alert => (
                  <tr key={alert.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{alert.userName || '—'}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{alert.claimCount}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600,
                      color: alert.riskScore > 50 ? '#e74c3c' : alert.riskScore > 20 ? '#f39c12' : '#27ae60' }}>
                      {alert.riskScore}
                    </td>
                    <td>
                      <span className={`severity-badge ${alert.severity}`}>
                        {alert.severity?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#666' }}>
                      {alert.reasons?.join('; ') || alert.type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Risk Zones */}
        <section className="dashboard-section">
          <h3>Risk Zones</h3>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr><th>City</th><th>Risk Level</th><th>Peak Hazard</th></tr>
              </thead>
              <tbody>
                {riskZones.map((zone, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{zone.location}</td>
                    <td>
                      <span className={`risk-badge ${zone.riskLevel?.toLowerCase()}`}>
                        {zone.riskLevel}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#666' }}>
                      {zone.weatherConditions?.primaryHazard || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminDashboard
