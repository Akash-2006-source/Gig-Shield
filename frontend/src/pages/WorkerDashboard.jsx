import React, { useCallback, useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import WorkerCard from '../components/WorkerCard'
import ClaimAlert from '../components/ClaimAlert'
import { getDashboardData, updateProfile } from '../services/userService'
import { getClaims } from '../services/claimService'
import '../styles/dashboard.css'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

const buildAlerts = (weather, claims) => {
  const alerts = []

  if (weather) {
    const condition = String(weather.condition || '').toLowerCase()
    if (condition === 'rain' || condition === 'drizzle') {
      alerts.push({
        id: 'weather-rain',
        title: 'Rain alert',
        message: `Rainfall conditions are active in your area. Weather and payout triggers are being monitored in real time.`
      })
    } else if (condition === 'thunderstorm') {
      alerts.push({
        id: 'weather-storm',
        title: 'Thunderstorm alert',
        message: 'Severe thunderstorm conditions may trigger zero-touch income protection.'
      })
    } else if (weather.temperature >= 42) {
      alerts.push({
        id: 'weather-heat',
        title: 'Extreme heat alert',
        message: 'Heat stress conditions are elevated. Your policy is being monitored for automatic trigger eligibility.'
      })
    }
  }

  const pendingClaims = claims.filter((claim) => ['pending', 'flagged', 'under_review'].includes(String(claim.status || '').toLowerCase()))
  if (pendingClaims.length > 0) {
    alerts.push({
      id: 'claims-pending',
      title: `${pendingClaims.length} payout(s) in progress`,
      message: 'Your pending claims are being reviewed or processed for direct payout.',
      amount: pendingClaims.reduce((sum, claim) => sum + Number(claim.amount || 0), 0)
    })
  }

  return alerts
}

const WorkerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null)
  const [claimsHistory, setClaimsHistory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [gpsStatus, setGpsStatus] = useState('')
  const [profileForm, setProfileForm] = useState({
    location: '',
    platform: '',
    avgDailyEarnings: '',
    deliveryZone: '',
    latitude: '',
    longitude: '',
    payoutMethod: 'UPI',
    payoutHandle: '',
    payoutAccountName: '',
    directPayoutConsent: false,
    locationTrackingConsent: false
  })

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, claimsRes] = await Promise.all([getDashboardData(), getClaims()])
      setDashboardData(dashRes)
      setClaimsHistory(claimsRes)
      setProfileForm({
        location: dashRes?.user?.location || '',
        platform: dashRes?.user?.platform || dashRes?.user?.occupation || '',
        avgDailyEarnings: dashRes?.user?.avgDailyEarnings || '',
        deliveryZone: dashRes?.user?.deliveryZone || '',
        latitude: dashRes?.user?.latitude || '',
        longitude: dashRes?.user?.longitude || '',
        payoutMethod: dashRes?.user?.payoutMethod || 'UPI',
        payoutHandle: dashRes?.user?.payoutHandle || '',
        payoutAccountName: dashRes?.user?.payoutAccountName || '',
        directPayoutConsent: Boolean(dashRes?.user?.directPayoutConsent),
        locationTrackingConsent: Boolean(dashRes?.user?.locationTrackingConsent)
      })
      setAlerts(buildAlerts(dashRes?.weather, claimsRes))
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const captureGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported in this browser')
      return
    }

    setGpsStatus('Capturing current location...')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(6)
        const longitude = position.coords.longitude.toFixed(6)
        setProfileForm((prev) => ({ ...prev, latitude, longitude }))
        setGpsStatus(`Location captured at ${latitude}, ${longitude}`)
      },
      (geoError) => {
        setGpsStatus(geoError.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

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
        location: profileForm.location,
        platform: profileForm.platform,
        occupation: profileForm.platform,
        deliveryZone: profileForm.deliveryZone || undefined,
        avgDailyEarnings: profileForm.avgDailyEarnings ? parseFloat(profileForm.avgDailyEarnings) : undefined,
        latitude: profileForm.latitude !== '' ? parseFloat(profileForm.latitude) : undefined,
        longitude: profileForm.longitude !== '' ? parseFloat(profileForm.longitude) : undefined,
        payoutMethod: profileForm.payoutMethod || undefined,
        payoutHandle: profileForm.payoutHandle || undefined,
        payoutAccountName: profileForm.payoutAccountName || undefined,
        directPayoutConsent: profileForm.directPayoutConsent,
        locationTrackingConsent: profileForm.locationTrackingConsent
      })
      setProfileMsg('Profile updated successfully')
      setShowProfileForm(false)
      fetchData()
    } catch (err) {
      setProfileMsg(err.response?.data?.message || 'Update failed')
    } finally {
      setProfileLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content"><div className="loading">Loading dashboard...</div></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content"><div className="error">{error}</div></div>
      </div>
    )
  }

  const workerData = {
    name: dashboardData?.user?.name || 'User',
    platform: dashboardData?.user?.platform || dashboardData?.user?.occupation || '-',
    location: dashboardData?.user?.location || '-',
    weeklyPremium: dashboardData?.policy?.premium || 0,
    coverageLimit: dashboardData?.policy?.coverage || 0,
    status: dashboardData?.policy?.status || 'Inactive'
  }

  const directPayoutReady = Boolean(dashboardData?.user?.directPayoutConsent && dashboardData?.user?.payoutHandle)
  const locationTrackingReady = Boolean(
    dashboardData?.user?.locationTrackingConsent &&
    dashboardData?.user?.latitude &&
    dashboardData?.user?.longitude
  )

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Worker Dashboard</h2>

        {showProfileForm && (
          <div className="info-card" style={{ marginBottom: '1.5rem' }}>
            <h3>Update Work Details</h3>
            {profileMsg && (
              <div className={profileMsg === 'Profile updated successfully' ? 'success-message' : 'error-message'}>
                {profileMsg}
              </div>
            )}
            <form onSubmit={handleProfileUpdate} className="auth-form" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Work City / Location</label>
                <input type="text" value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Delivery Platform</label>
                <select value={profileForm.platform} onChange={(e) => setProfileForm({ ...profileForm, platform: e.target.value })} required>
                  <option value="">Select Platform</option>
                  {PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Average Daily Earnings</label>
                <input type="number" value={profileForm.avgDailyEarnings} onChange={(e) => setProfileForm({ ...profileForm, avgDailyEarnings: e.target.value })} min="100" max="5000" />
              </div>
              <div className="form-group">
                <label>Delivery Zone</label>
                <input type="text" value={profileForm.deliveryZone} onChange={(e) => setProfileForm({ ...profileForm, deliveryZone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Home GPS for anti-spoofing verification</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" className="action-btn" onClick={captureGps}>Capture current location</button>
                  {profileForm.latitude && profileForm.longitude && (
                    <span style={{ fontSize: 12, color: '#27ae60' }}>{Number(profileForm.latitude).toFixed(4)}, {Number(profileForm.longitude).toFixed(4)}</span>
                  )}
                </div>
                {gpsStatus && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{gpsStatus}</div>}
              </div>

              <div className="info-card" style={{ marginBottom: '1rem', background: '#f8fbff' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>Direct payment to the delivery partner</h3>
                <p style={{ color: '#666', fontSize: 13, marginBottom: '0.75rem' }}>
                  Approved payouts go directly to the delivery partner account. No third-party involvement.
                </p>
                <div className="form-group">
                  <label>Payout Method</label>
                  <select value={profileForm.payoutMethod} onChange={(e) => setProfileForm({ ...profileForm, payoutMethod: e.target.value })}>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{profileForm.payoutMethod === 'UPI' ? 'UPI ID' : 'Bank transfer reference'}</label>
                  <input type="text" value={profileForm.payoutHandle} onChange={(e) => setProfileForm({ ...profileForm, payoutHandle: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Account Holder Name</label>
                  <input type="text" value={profileForm.payoutAccountName} onChange={(e) => setProfileForm({ ...profileForm, payoutAccountName: e.target.value })} />
                </div>
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                  <input type="checkbox" checked={profileForm.directPayoutConsent} onChange={(e) => setProfileForm({ ...profileForm, directPayoutConsent: e.target.checked })} />
                  <span>I confirm direct payment to the delivery partner with no third-party involvement.</span>
                </label>
              </div>

              <div className="info-card" style={{ marginBottom: '1rem', background: '#f8fbff' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>Tracking the location of the delivery partner</h3>
                <p style={{ color: '#666', fontSize: 13, marginBottom: '0.75rem' }}>
                  Consented GPS verification helps match exact trigger zones and reduce spoofing-based fraud.
                </p>
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                  <input type="checkbox" checked={profileForm.locationTrackingConsent} onChange={(e) => setProfileForm({ ...profileForm, locationTrackingConsent: e.target.checked })} />
                  <span>I consent to location tracking for trigger verification and fair payouts.</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="submit-btn" disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="action-btn cancel" onClick={() => setShowProfileForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {dashboardData?.weather && (
          <section className="dashboard-section">
            <div className="weather-card">
              <div className="weather-details">
                <h3>Current Weather - {workerData.location}</h3>
                <p className="weather-condition">{dashboardData.weather.condition}</p>
                <div className="weather-stats">
                  <span>{dashboardData.weather.temperature}C</span>
                  <span>{dashboardData.weather.humidity}% humidity</span>
                  {dashboardData.weather.aqi && <span>AQI {dashboardData.weather.aqi}</span>}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="dashboard-section">
          <WorkerCard
            name={workerData.name}
            platform={workerData.platform}
            location={workerData.location}
            weeklyPremium={workerData.weeklyPremium}
            coverageLimit={workerData.coverageLimit}
            status={workerData.status}
          />
          <button className="link-btn" style={{ marginTop: '0.5rem', fontSize: 13 }} onClick={() => setShowProfileForm(true)}>
            Edit work details and payout settings
          </button>
        </section>

        <section className="dashboard-section">
          <div className="info-card">
            <h3>Insurance Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Weekly Premium</span>
                <span className="value">{workerData.weeklyPremium}</span>
              </div>
              <div className="info-item">
                <span className="label">Coverage Limit</span>
                <span className="value">{workerData.coverageLimit}</span>
              </div>
              <div className="info-item">
                <span className="label">Policy Status</span>
                <span className={`status-badge ${String(workerData.status).toLowerCase()}`}>{workerData.status}</span>
              </div>
              <div className="info-item">
                <span className="label">Risk Level</span>
                <span className={`risk-badge ${String(dashboardData?.riskLevel || 'medium').toLowerCase()}`}>{dashboardData?.riskLevel || 'Medium'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="earnings-card">
            <h3>Earnings Protected This Week</h3>
            <p className="earnings-amount">{dashboardData?.earningsProtected || 0}</p>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="info-grid">
            <div className="info-card">
              <h3>Direct payment to the delivery partner</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: '0.75rem' }}>
                Approved payouts go directly to the delivery partner account with no third-party involvement.
              </p>
              <div className="info-item">
                <span className="label">Status</span>
                <span className={`status-badge ${directPayoutReady ? 'approved' : 'pending'}`}>
                  {directPayoutReady ? 'Direct payout enabled' : 'Setup required'}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Destination</span>
                <span className="value">{dashboardData?.user?.payoutHandle || 'Add your UPI or bank payout route'}</span>
              </div>
            </div>

            <div className="info-card">
              <h3>Tracking the location of the delivery partner</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: '0.75rem' }}>
                Live location verification helps us match exact trigger zones, price hyper-local risk fairly, and block spoofing.
              </p>
              <div className="info-item">
                <span className="label">Tracking status</span>
                <span className={`status-badge ${locationTrackingReady ? 'approved' : 'pending'}`}>
                  {locationTrackingReady ? 'Tracking active' : 'Consent or location sync needed'}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Last sync</span>
                <span className="value">
                  {dashboardData?.user?.lastTrackedAt
                    ? new Date(dashboardData.user.lastTrackedAt).toLocaleString()
                    : 'No recent location sync'}
                </span>
              </div>
              <button
                type="button"
                className="action-btn"
                style={{ marginTop: '0.75rem' }}
                onClick={() => {
                  setShowProfileForm(true)
                  captureGps()
                }}
              >
                Sync delivery-partner location now
              </button>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="table-card">
            <h3>Claims History</h3>
            {claimsHistory.length === 0 ? (
              <p style={{ color: '#888', padding: '1rem' }}>No claims yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Disruption</th>
                    <th>Trigger</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {claimsHistory.map((claim) => (
                    <tr key={claim.id}>
                      <td>{new Date(claim.submittedAt).toDateString()}</td>
                      <td>{claim.description}</td>
                      <td>{claim.triggerValue || '-'}</td>
                      <td>{claim.amount}</td>
                      <td><span className={`status-badge ${String(claim.status || '').toLowerCase()}`}>{claim.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <h3>Live Alerts</h3>
          {alerts.length === 0
            ? <p style={{ color: '#888' }}>No active alerts.</p>
            : alerts.map((alert) => (
              <ClaimAlert
                key={alert.id}
                title={alert.title}
                message={alert.message}
                amount={alert.amount || null}
              />
            ))}
        </section>
      </div>
    </div>
  )
}

export default WorkerDashboard
