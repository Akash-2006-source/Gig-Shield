import React, { useState, useEffect, useCallback } from 'react'
import Navbar      from '../components/Navbar'
import ClaimAlert  from '../components/ClaimAlert'
import '../styles/dashboard.css'
import { getDashboardData, updateProfile } from '../services/userService'
import { getClaims }                         from '../services/claimService'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

// ── Build dynamic alerts from live data ──────────────────────────────────────
const buildAlerts = (weather, claims) => {
  const alerts = []

  if (weather) {
    const cond = weather.condition?.toLowerCase() ?? ''

    if (cond === 'rain' || cond === 'drizzle') {
      alerts.push({
        id: 'weather-rain',
        title: '🌧️ Rain Alert — Parametric trigger active',
        message: `Rainfall detected in your area (${weather.temperature}°C, ${weather.humidity}% humidity). If rainfall exceeds 50mm/3hr, your income-loss claim will be filed automatically.`,
        type: 'warning'
      })
    } else if (cond === 'thunderstorm') {
      alerts.push({
        id: 'weather-storm',
        title: '⛈️ Thunderstorm — Auto-claim likely',
        message: `Thunderstorm conditions active in ${weather.location || 'your area'}. Parametric trigger is monitoring — payout will be initiated if thresholds are met.`,
        type: 'danger'
      })
    } else if (weather.temperature >= 42) {
      alerts.push({
        id: 'weather-heat',
        title: '🌡️ Extreme Heat Alert',
        message: `Temperature is ${weather.temperature}°C — exceeds 42°C threshold. Standard/Pro plan holders may be eligible for an auto-claim.`,
        type: 'warning'
      })
    } else if (weather.aqi && weather.aqi >= 200) {
      alerts.push({
        id: 'weather-aqi',
        title: '😷 Severe AQI Alert',
        message: `Air quality index is ${weather.aqi} (Severe). Outdoor delivery is hazardous. Auto-claim may be triggered for eligible plan holders.`,
        type: 'warning'
      })
    } else {
      alerts.push({
        id: 'weather-ok',
        title: '✅ Weather monitoring active',
        message: `Current conditions are normal (${weather.condition}, ${weather.temperature}°C). Your area is being monitored for disruptions.`,
        type: 'info'
      })
    }
  }

  const pendingClaims = claims.filter(c => c.status === 'pending' || c.status === 'approved' && !c.processedAt)
  if (pendingClaims.length > 0) {
    alerts.push({
      id: 'claim-pending',
      title: `💰 ${pendingClaims.length} claim(s) in progress`,
      message: `You have ${pendingClaims.length} pending claim(s). Payouts are processed within 4 hours via UPI.`,
      amount: pendingClaims.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
      type: 'info'
    })
  }

  return alerts
}

// ── Animated Stat Card ───────────────────────────────────────────────────────
const ModernStatCard = ({ title, value, icon, subtitle, color = '#667eea', trend }) => (
  <div className="modern-stat-card" style={{ '--card-color': color }}>
    <div className="modern-stat-icon">{icon}</div>
    <div className="modern-stat-content">
      <div className="modern-stat-title">{title}</div>
      <div className="modern-stat-value">{value}</div>
      {subtitle && <div className="modern-stat-subtitle">{subtitle}</div>}
      {trend && (
        <div className={`modern-stat-trend ${trend > 0 ? 'positive' : 'negative'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  </div>
)

// ── Mini bar chart — monthly payouts vs premiums ─────────────────────────────
const PayoutChart = ({ claims, weeklyPremium }) => {
  if (!claims || claims.length === 0) return null

  const now = Date.now()
  const WEEK = 7 * 24 * 60 * 60 * 1000
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = now - (8 - i) * WEEK
    const end   = start + WEEK
    const payout = claims
      .filter(cl => {
        const t = new Date(cl.submittedAt).getTime()
        return t >= start && t < end && cl.status === 'approved'
      })
      .reduce((s, cl) => s + parseFloat(cl.amount || 0), 0)
    return { label: `W${i + 1}`, payout, premium: parseFloat(weeklyPremium) || 0 }
  })

  const maxVal = Math.max(...weeks.map(w => Math.max(w.payout, w.premium)), 1)
  const H = 100, barW = 16, gap = 8, groupW = barW * 2 + gap + 12

  return (
    <div className="payout-chart-container">
      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-dot payout"></span> Payout received
        </span>
        <span className="legend-item">
          <span className="legend-dot premium"></span> Premium paid
        </span>
      </div>
      <div className="chart-svg-wrapper">
        <svg width="100%" viewBox={`0 0 ${groupW * 8 + 20} ${H + 30}`} style={{ overflow: 'visible' }}>
          {weeks.map((w, i) => {
            const x    = 10 + i * groupW
            const payH = Math.round((w.payout  / maxVal) * H)
            const preH = Math.round((w.premium / maxVal) * H)
            return (
              <g key={i} className="chart-bar-group">
                <rect x={x} y={H - payH} width={barW} height={payH || 2} fill="url(#payoutGradient)" rx="3" className="chart-bar payout-bar" />
                <rect x={x + barW + gap} y={H - preH} width={barW} height={preH || 2} fill="url(#premiumGradient)" rx="3" className="chart-bar premium-bar" />
                <text x={x + barW} y={H + 18} textAnchor="middle" fontSize="10" className="chart-label">{w.label}</text>
                {payH > 0 && (
                  <text x={x + barW/2} y={H - payH - 6} textAnchor="middle" fontSize="9" className="chart-value">₹{w.payout}</text>
                )}
              </g>
            )
          })}
          <defs>
            <linearGradient id="payoutGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="premiumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>
          <line x1="10" y1={H} x2={groupW * 8 + 10} y2={H} stroke="#e2e8f0" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}

// ── Weather Widget ───────────────────────────────────────────────────────────
const WeatherWidget = ({ weather, location }) => {
  if (!weather) return null

  const getWeatherIcon = (condition, temp) => {
    const cond = condition?.toLowerCase()
    if (cond === 'rain' || cond === 'drizzle') return '🌧️'
    if (cond === 'thunderstorm') return '⛈️'
    if (cond === 'snow') return '❄️'
    if (cond === 'clouds') return '☁️'
    if (temp >= 40) return '🔥'
    return '☀️'
  }

  const getWeatherGradient = (condition, temp) => {
    const cond = condition?.toLowerCase()
    if (cond === 'rain' || cond === 'thunderstorm') return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    if (temp >= 40) return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    if (cond === 'clouds') return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  }

  return (
    <div className="weather-widget" style={{ background: getWeatherGradient(weather.condition, weather.temperature) }}>
      <div className="weather-widget-content">
        <div className="weather-main">
          <div className="weather-icon-large">
            {getWeatherIcon(weather.condition, weather.temperature)}
          </div>
          <div className="weather-temp">{weather.temperature}°C</div>
        </div>
        <div className="weather-info">
          <div className="weather-condition">{weather.condition}</div>
          <div className="weather-location">📍 {location}</div>
          <div className="weather-details">
            <span>💧 {weather.humidity}%</span>
            {weather.aqi && <span>💨 AQI {weather.aqi}</span>}
          </div>
        </div>
      </div>
      {(weather.condition === 'Rain' || weather.condition === 'Thunderstorm' || weather.temperature >= 42 || (weather.aqi && weather.aqi >= 200)) && (
        <div className="weather-alert-badge">
          ⚠️ Auto-claim monitoring active
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
const WorkerDashboard = () => {
  const [dashboardData,  setDashboardData]  = useState(null)
  const [claimsHistory,  setClaimsHistory]  = useState([])
  const [alerts,         setAlerts]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileForm,    setProfileForm]    = useState({ location: '', platform: '', avgDailyEarnings: '', deliveryZone: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg,     setProfileMsg]     = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, claimsRes] = await Promise.all([
        getDashboardData(),
        getClaims()
      ])
      setDashboardData(dashRes)
      setClaimsHistory(claimsRes)
      setProfileForm({
        location:          dashRes?.user?.location          || '',
        platform:          dashRes?.user?.platform          || dashRes?.user?.occupation || '',
        avgDailyEarnings:  dashRes?.user?.avgDailyEarnings  || '',
        deliveryZone:      dashRes?.user?.deliveryZone      || ''
      })
      setAlerts(buildAlerts(dashRes?.weather, claimsRes))
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setProfileMsg('')
    if (!profileForm.location || !profileForm.platform) {
      setProfileMsg('Please fill in at least location and platform')
      return
    }
    try {
      setProfileLoading(true)
      await updateProfile({
        location:         profileForm.location,
        platform:         profileForm.platform,
        occupation:       profileForm.platform,
        deliveryZone:     profileForm.deliveryZone || undefined,
        avgDailyEarnings: profileForm.avgDailyEarnings
          ? parseFloat(profileForm.avgDailyEarnings)
          : undefined
      })
      setProfileMsg('✅ Profile updated successfully!')
      setShowProfileForm(false)
      fetchData()
    } catch (err) {
      setProfileMsg(err.response?.data?.message || 'Update failed')
    } finally {
      setProfileLoading(false)
    }
  }

  if (loading) return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="loading-skeleton">
          <div className="skeleton-loader">
            <div className="skeleton-circle"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-text short"></div>
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

  const workerData = {
    name:             dashboardData?.user?.name             || 'User',
    platform:         dashboardData?.user?.occupation       || '—',
    location:         dashboardData?.user?.location         || '—',
    weeklyPremium:    dashboardData?.policy?.premium        || 0,
    coverageLimit:    dashboardData?.policy?.coverage       || 0,
    status:           dashboardData?.policy?.status         || 'Inactive',
    riskLevel:        dashboardData?.riskLevel              || 'Medium',
    earningsProtected: dashboardData?.earningsProtected     || 0
  }

  const needsProfile = !dashboardData?.user?.location || !dashboardData?.user?.occupation
  const totalPayouts = claimsHistory.filter(c => c.status === 'approved').reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
  const activeClaims = claimsHistory.filter(c => c.status === 'pending').length

  return (
    <div className="dashboard-container modern-dashboard">
      <Navbar />
      <div className="dashboard-content">
        {/* Header with greeting */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="dashboard-title">
              Welcome back, <span className="gradient-text">{workerData.name.split(' ')[0]}</span> 👋
            </h1>
            <p className="dashboard-subtitle">
              Here's your insurance overview and live protection status
            </p>
          </div>
          <div className="header-actions">
            <button className="modern-btn secondary" onClick={() => setShowProfileForm(true)}>
              ✏️ Edit Profile
            </button>
          </div>
        </div>

        {/* Incomplete profile banner */}
        {needsProfile && !showProfileForm && (
          <div className="profile-banner-modern">
            <span className="banner-icon">⚠️</span>
            <span className="banner-text">Your work location and platform are not set.</span>
            <button className="banner-btn" onClick={() => setShowProfileForm(true)}>
              Set them now →
            </button>
          </div>
        )}

        {/* Profile update form */}
        {showProfileForm && (
          <div className="profile-form-card">
            <div className="card-header">
              <h3>Update Work Details</h3>
              <button className="close-btn" onClick={() => setShowProfileForm(false)}>×</button>
            </div>
            {profileMsg && (
              <div className={profileMsg.startsWith('✅') ? 'success-message' : 'error-message'}>
                {profileMsg}
              </div>
            )}
            <form onSubmit={handleProfileUpdate} className="modern-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Work City / Location</label>
                  <input
                    type="text"
                    value={profileForm.location}
                    onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                    placeholder="e.g. Chennai, Mumbai, Delhi"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Delivery Platform</label>
                  <select
                    value={profileForm.platform}
                    onChange={e => setProfileForm({ ...profileForm, platform: e.target.value })}
                    required
                  >
                    <option value="">Select Platform</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Avg Daily Earnings (₹)</label>
                  <input
                    type="number"
                    value={profileForm.avgDailyEarnings}
                    onChange={e => setProfileForm({ ...profileForm, avgDailyEarnings: e.target.value })}
                    placeholder="e.g. 820"
                    min="100"
                    max="5000"
                  />
                </div>
                <div className="form-group">
                  <label>Delivery Zone (optional)</label>
                  <input
                    type="text"
                    value={profileForm.deliveryZone}
                    onChange={e => setProfileForm({ ...profileForm, deliveryZone: e.target.value })}
                    placeholder="e.g. T. Nagar / Mylapore"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="modern-btn primary" disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button type="button" className="modern-btn ghost" onClick={() => setShowProfileForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats Overview */}
        <div className="stats-grid-modern">
          <ModernStatCard
            title="Coverage Limit"
            value={`₹${workerData.coverageLimit.toLocaleString()}`}
            icon="🛡️"
            subtitle={`Premium: ₹${workerData.weeklyPremium}/week`}
            color="#667eea"
          />
          <ModernStatCard
            title="Earnings Protected"
            value={`₹${workerData.earningsProtected.toLocaleString()}`}
            icon="💰"
            subtitle="This week"
            color="#10b981"
          />
          <ModernStatCard
            title="Total Payouts"
            value={`₹${totalPayouts.toLocaleString()}`}
            icon="💸"
            subtitle={`${claimsHistory.filter(c => c.status === 'approved').length} claims approved`}
            color="#f59e0b"
          />
          <ModernStatCard
            title="Active Claims"
            value={activeClaims}
            icon="📋"
            subtitle={activeClaims > 0 ? 'Processing' : 'No pending claims'}
            color="#8b5cf6"
          />
        </div>

        {/* Main Grid Layout */}
        <div className="dashboard-grid">
          {/* Left Column */}
          <div className="dashboard-main">
            {/* Weather Widget */}
            <WeatherWidget weather={dashboardData?.weather} location={workerData.location} />

            {/* Insurance Status Card */}
            <div className="modern-card">
              <div className="card-header">
                <h3>📊 Insurance Status</h3>
                <span className={`status-pill ${workerData.status.toLowerCase()}`}>
                  {workerData.status === 'active' ? '●' : '○'} {workerData.status}
                </span>
              </div>
              <div className="info-grid-modern">
                <div className="info-item-modern">
                  <div className="info-label">Platform</div>
                  <div className="info-value">{workerData.platform}</div>
                </div>
                <div className="info-item-modern">
                  <div className="info-label">Location</div>
                  <div className="info-value">{workerData.location}</div>
                </div>
                <div className="info-item-modern">
                  <div className="info-label">Risk Level</div>
                  <div className={`risk-badge-modern ${workerData.riskLevel.toLowerCase()}`}>
                    {workerData.riskLevel}
                  </div>
                </div>
                <div className="info-item-modern">
                  <div className="info-label">Weekly Premium</div>
                  <div className="info-value">₹{workerData.weeklyPremium}</div>
                </div>
              </div>
            </div>

            {/* Claims History */}
            <div className="modern-card">
              <div className="card-header">
                <h3>📝 Claims History</h3>
                {claimsHistory.length > 0 && (
                  <span className="badge">{claimsHistory.length} total</span>
                )}
              </div>
              {claimsHistory.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>No claims yet</p>
                  <span className="empty-subtitle">You're protected — claims auto-file when disruptions occur</span>
                </div>
              ) : (
                <div className="claims-list">
                  {claimsHistory.slice(0, 5).map(claim => (
                    <div key={claim.id} className="claim-item">
                      <div className="claim-info">
                        <div className="claim-type">{claim.triggerType || 'Manual Claim'}</div>
                        <div className="claim-date">{new Date(claim.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        {claim.description && <div className="claim-desc">{claim.description}</div>}
                      </div>
                      <div className="claim-right">
                        <div className="claim-amount">₹{Number(claim.amount).toLocaleString()}</div>
                        <span className={`claim-status ${claim.status?.toLowerCase()}`}>
                          {claim.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payout Chart */}
            {claimsHistory.length > 0 && (
              <div className="modern-card">
                <div className="card-header">
                  <h3>📈 Payout Analytics (Last 8 Weeks)</h3>
                </div>
                <PayoutChart claims={claimsHistory} weeklyPremium={dashboardData?.policy?.premium} />
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="dashboard-sidebar">
            {/* Live Alerts */}
            <div className="modern-card sidebar-card">
              <div className="card-header">
                <h3>🔔 Live Alerts</h3>
                <span className="live-indicator">
                  <span className="pulse"></span> LIVE
                </span>
              </div>
              {alerts.length === 0 ? (
                <div className="empty-state-small">
                  <p>No active alerts</p>
                </div>
              ) : (
                <div className="alerts-list">
                  {alerts.map(alert => (
                    <ClaimAlert
                      key={alert.id}
                      title={alert.title}
                      message={alert.message}
                      amount={alert.amount || null}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="modern-card sidebar-card">
              <div className="card-header">
                <h3>⚡ Quick Actions</h3>
              </div>
              <div className="quick-actions">
                <a href="/policy" className="action-btn-modern">
                  <span className="action-icon">📄</span>
                  <span>View Policy</span>
                </a>
                <a href="/claim" className="action-btn-modern">
                  <span className="action-icon">📝</span>
                  <span>Submit Claim</span>
                </a>
                <a href="/profile" className="action-btn-modern">
                  <span className="action-icon">👤</span>
                  <span>Profile</span>
                </a>
              </div>
            </div>

            {/* Protection Status */}
            <div className="modern-card sidebar-card protection-card">
              <h3>🛡️ Protection Status</h3>
              <div className="protection-meter">
                <div className="meter-fill" style={{ width: `${Math.min((workerData.earningsProtected / workerData.coverageLimit) * 100, 100)}%` }}></div>
              </div>
              <div className="protection-stats">
                <div className="protection-stat">
                  <span className="stat-label">Protected</span>
                  <span className="stat-value">₹{workerData.earningsProtected}</span>
                </div>
                <div className="protection-stat">
                  <span className="stat-label">Limit</span>
                  <span className="stat-value">₹{workerData.coverageLimit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkerDashboard
