import React, { useState, useEffect, useCallback } from 'react'
import Navbar    from '../components/Navbar'
import '../styles/dashboard.css'
import {
  getDashboardStats, getRiskZones, getFraudAlerts,
  getAllClaims, getFlaggedClaims, updateClaimStatus
} from '../services/adminService'

// ── Modern Stat Card ─────────────────────────────────────────────────────────
const AdminStatCard = ({ title, value, icon, subtitle, color = '#667eea', trend }) => (
  <div className="admin-stat-card" style={{ '--accent-color': color }}>
    <div className="admin-stat-header">
      <div className="admin-stat-icon" style={{ background: `${color}20`, color }}>{icon}</div>
      {trend && (
        <div className={`admin-trend ${trend > 0 ? 'trend-up' : 'trend-down'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="admin-stat-value">{value}</div>
    <div className="admin-stat-title">{title}</div>
    {subtitle && <div className="admin-stat-subtitle">{subtitle}</div>}
  </div>
)

// ── Progress Ring ────────────────────────────────────────────────────────────
const ProgressRing = ({ value, max = 100, size = 120, strokeWidth = 10, color = '#667eea' }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / max) * circumference
  
  return (
    <div className="progress-ring-container">
      <svg width={size} height={size} className="progress-ring">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="progress-ring-circle"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dy="0.35em"
          className="progress-ring-text"
          style={{ fontSize: size * 0.2, fontWeight: 700, fill: color }}
        >
          {value}%
        </text>
      </svg>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [metrics,       setMetrics]       = useState({ workersInsured:0, activePolicies:0, totalPremium:0, totalPayout:0, lossRatio:0, combinedRatio:0, targetLossRatio:65, flaggedClaims:0 })
  const [claimsOverview,setClaimsOverview]= useState({ claimsToday:0, claimsThisWeek:0, totalPayout:0 })
  const [fraudAlerts,   setFraudAlerts]   = useState([])
  const [riskZones,     setRiskZones]     = useState([])
  const [claims,        setClaims]        = useState([])
  const [claimPage,     setClaimPage]     = useState(1)
  const [claimTotal,    setClaimTotal]    = useState(0)
  const [claimFilter,   setClaimFilter]   = useState('all')
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
    } catch { /* silent */ }
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
    if (status === 'rejected' && notes === null) return
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
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="loading-skeleton">
          <div className="skeleton-loader">
            <div className="skeleton-circle"></div>
            <div className="skeleton-text"></div>
          </div>
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Failed to load dashboard</h3>
          <p>{error}</p>
        </div>
      </div>
    </div>
  )

  const lrColor = metrics.lossRatio > 80 ? '#e74c3c' : metrics.lossRatio > 65 ? '#f59e0b' : '#10b981'

  return (
    <div className="dashboard-container admin-dashboard">
      <Navbar />
      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="dashboard-title">
              Admin <span className="gradient-text">Dashboard</span> 📊
            </h1>
            <p className="dashboard-subtitle">
              Real-time platform analytics and claims management
            </p>
          </div>
          <div className="header-actions">
            <div className="live-badge">
              <span className="pulse"></span> Live Data
            </div>
          </div>
        </div>

        {/* Platform Metrics */}
        <div className="stats-grid-modern">
          <AdminStatCard
            title="Workers Insured"
            value={metrics.workersInsured.toLocaleString()}
            icon="👥"
            subtitle="Active users"
            color="#667eea"
          />
          <AdminStatCard
            title="Active Policies"
            value={metrics.activePolicies.toLocaleString()}
            icon="📋"
            subtitle="Currently covered"
            color="#10b981"
          />
          <AdminStatCard
            title="Total Premium"
            value={`₹${metrics.totalPremium.toLocaleString()}`}
            icon="💰"
            subtitle="Collected revenue"
            color="#f59e0b"
          />
          <AdminStatCard
            title="Total Payouts"
            value={`₹${metrics.totalPayout.toLocaleString()}`}
            icon="💸"
            subtitle="Claims paid"
            color="#ef4444"
          />
        </div>

        {/* Actuarial Health & Analytics */}
        <div className="dashboard-grid">
          <div className="dashboard-main">
            <div className="modern-card">
              <div className="card-header">
                <h3>📈 Actuarial Health Metrics</h3>
              </div>
              <div className="actuarial-grid">
                <div className="actuarial-main">
                  <ProgressRing
                    value={Math.round(metrics.lossRatio)}
                    max={100}
                    size={160}
                    strokeWidth={12}
                    color={lrColor}
                  />
                  <div className="actuarial-label">Loss Ratio</div>
                  <div className="actuarial-description">
                    {metrics.lossRatio > 80 ? '⚠️ Critical - Above target' : 
                     metrics.lossRatio > 65 ? '⚡ Near optimal range' : 
                     '✅ Healthy - Below target'}
                  </div>
                </div>
                <div className="actuarial-stats">
                  <div className="actuarial-item">
                    <div className="actuarial-item-label">Combined Ratio</div>
                    <div className="actuarial-item-value">{metrics.combinedRatio}%</div>
                    <div className="actuarial-item-desc">Total costs / Premiums</div>
                  </div>
                  <div className="actuarial-item">
                    <div className="actuarial-item-label">Target Loss Ratio</div>
                    <div className="actuarial-item-value">{metrics.targetLossRatio}%</div>
                    <div className="actuarial-item-desc">Optimal: 63-68%</div>
                  </div>
                  <div className="actuarial-item">
                    <div className="actuarial-item-label">Claims Today</div>
                    <div className="actuarial-item-value">{claimsOverview.claimsToday}</div>
                    <div className="actuarial-item-desc">Last 24 hours</div>
                  </div>
                  <div className="actuarial-item">
                    <div className="actuarial-item-label">Claims This Week</div>
                    <div className="actuarial-item-value">{claimsOverview.claimsThisWeek}</div>
                    <div className="actuarial-item-desc">Last 7 days</div>
                  </div>
                  <div className="actuarial-item warning">
                    <div className="actuarial-item-label">Flagged Claims</div>
                    <div className="actuarial-item-value" style={{ color: metrics.flaggedClaims > 0 ? '#ef4444' : '#10b981' }}>
                      {metrics.flaggedClaims}
                    </div>
                    <div className="actuarial-item-desc">Requires review</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Claims Management */}
            <div className="modern-card">
              <div className="card-header">
                <h3>📝 Claims Management</h3>
                <div className="filter-tabs">
                  {['all', 'flagged'].map(f => (
                    <button
                      key={f}
                      className={`filter-tab ${claimFilter === f ? 'active' : ''}`}
                      onClick={() => handleFilterChange(f)}
                    >
                      {f === 'all' ? `All (${claimTotal})` : `Flagged (${metrics.flaggedClaims})`}
                    </button>
                  ))}
                </div>
              </div>
              
              {claims.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>No claims found</p>
                </div>
              ) : (
                <div className="claims-table-wrapper">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Worker</th>
                        <th>Trigger Type</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map(claim => (
                        <tr key={claim.id} className="claim-row">
                          <td className="claim-id">#{claim.id}</td>
                          <td>
                            <div className="worker-info">
                              <div className="worker-name">{claim.user?.name || '—'}</div>
                              <div className="worker-email">{claim.user?.email}</div>
                            </div>
                          </td>
                          <td>
                            <div className="trigger-info">
                              <div className="trigger-type">{claim.triggerType || 'Manual'}</div>
                              {claim.description && (
                                <div className="trigger-desc">
                                  {claim.description.length > 50 
                                    ? `${claim.description.slice(0, 50)}…` 
                                    : claim.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="amount-cell">₹{Number(claim.amount).toLocaleString()}</td>
                          <td className="date-cell">
                            {new Date(claim.submittedAt).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </td>
                          <td>
                            <span className={`status-pill ${claim.status?.toLowerCase()}`}>
                              {claim.status}
                            </span>
                          </td>
                          <td>
                            {(claim.status === 'pending' || claim.status === 'flagged') ? (
                              <div className="action-buttons">
                                <button
                                  className="action-btn approve"
                                  disabled={actionLoading === claim.id}
                                  onClick={() => handleClaimAction(claim.id, 'approved')}
                                  title="Approve"
                                >
                                  {actionLoading === claim.id ? '⏳' : '✓'}
                                </button>
                                <button
                                  className="action-btn reject"
                                  disabled={actionLoading === claim.id}
                                  onClick={() => handleClaimAction(claim.id, 'rejected')}
                                  title="Reject"
                                >
                                  {actionLoading === claim.id ? '⏳' : '✕'}
                                </button>
                              </div>
                            ) : (
                              <span className="no-action">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {claimTotal > 20 && (
                <div className="pagination">
                  <button
                    disabled={claimPage === 1}
                    onClick={() => handlePageChange(claimPage - 1)}
                    className="pagination-btn"
                  >
                    ← Prev
                  </button>
                  <span className="pagination-info">
                    Page {claimPage} of {Math.ceil(claimTotal / 20)}
                  </span>
                  <button
                    disabled={claimPage >= Math.ceil(claimTotal / 20)}
                    onClick={() => handlePageChange(claimPage + 1)}
                    className="pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="dashboard-sidebar">
            {/* Fraud Alerts */}
            <div className="modern-card sidebar-card">
              <div className="card-header">
                <h3>🚨 Fraud Detection</h3>
                {fraudAlerts.length > 0 && (
                  <span className="alert-badge">{fraudAlerts.length}</span>
                )}
              </div>
              {fraudAlerts.length === 0 ? (
                <div className="empty-state-small">
                  <div className="empty-icon-small">✅</div>
                  <p>No fraud alerts</p>
                  <span className="empty-subtitle">All clear this week</span>
                </div>
              ) : (
                <div className="fraud-alerts-list">
                  {fraudAlerts.map(alert => (
                    <div key={alert.id} className={`fraud-alert-item ${alert.severity?.toLowerCase()}`}>
                      <div className="fraud-alert-header">
                        <div className="fraud-worker-name">{alert.userName || 'Unknown'}</div>
                        <span className={`severity-pill ${alert.severity?.toLowerCase()}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <div className="fraud-alert-details">
                        <div className="fraud-stat">
                          <span className="fraud-stat-label">Claims (7d)</span>
                          <span className="fraud-stat-value">{alert.claimCount}</span>
                        </div>
                        <div className="fraud-stat">
                          <span className="fraud-stat-label">Risk Score</span>
                          <span className="fraud-stat-value" style={{
                            color: alert.riskScore > 50 ? '#ef4444' : alert.riskScore > 20 ? '#f59e0b' : '#10b981'
                          }}>
                            {alert.riskScore}
                          </span>
                        </div>
                      </div>
                      {alert.reasons && alert.reasons.length > 0 && (
                        <div className="fraud-reasons">
                          {alert.reasons.map((reason, idx) => (
                            <span key={idx} className="reason-tag">{reason}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Risk Zones */}
            <div className="modern-card sidebar-card">
              <div className="card-header">
                <h3>🌍 Risk Zones</h3>
              </div>
              <div className="risk-zones-list">
                {riskZones.map((zone, i) => (
                  <div key={i} className="risk-zone-item">
                    <div className="risk-zone-info">
                      <div className="zone-location">{zone.location}</div>
                      <div className="zone-hazard">
                        {zone.weatherConditions?.primaryHazard || 'No active hazards'}
                      </div>
                    </div>
                    <span className={`risk-pill ${zone.riskLevel?.toLowerCase()}`}>
                      {zone.riskLevel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="modern-card sidebar-card quick-stats-card">
              <h3>⚡ Quick Overview</h3>
              <div className="quick-stats">
                <div className="quick-stat-item">
                  <div className="quick-stat-icon">📊</div>
                  <div className="quick-stat-info">
                    <div className="quick-stat-label">Avg Claim</div>
                    <div className="quick-stat-value">
                      ₹{claimsOverview.totalPayout > 0 
                        ? Math.round(claimsOverview.totalPayout / Math.max(claimsOverview.claimsThisWeek, 1))
                        : 0}
                    </div>
                  </div>
                </div>
                <div className="quick-stat-item">
                  <div className="quick-stat-icon">💵</div>
                  <div className="quick-stat-info">
                    <div className="quick-stat-label">Revenue</div>
                    <div className="quick-stat-value">₹{(metrics.totalPremium - metrics.totalPayout).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
