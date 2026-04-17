import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../services/api'
import '../styles/dashboard.css'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

const ProfilePage = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    location: '',
    occupation: '',
    avgDailyEarnings: '',
    deliveryZone: '',
    platformId: '',
    payoutMethod: 'UPI',
    payoutHandle: '',
    payoutAccountName: '',
    directPayoutConsent: false,
    locationTrackingConsent: false
  })

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile')
      setUser(res.data)
      setForm({
        location: res.data.location || '',
        occupation: res.data.occupation || res.data.platform || '',
        avgDailyEarnings: res.data.avgDailyEarnings || '',
        deliveryZone: res.data.deliveryZone || '',
        platformId: res.data.platformId || '',
        payoutMethod: res.data.payoutMethod || 'UPI',
        payoutHandle: res.data.payoutHandle || '',
        payoutAccountName: res.data.payoutAccountName || '',
        directPayoutConsent: Boolean(res.data.directPayoutConsent),
        locationTrackingConsent: Boolean(res.data.locationTrackingConsent)
      })
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setMsg('')

    if (!form.location || !form.occupation) {
      setMsg('Work city and platform are required')
      return
    }

    if (form.avgDailyEarnings && (isNaN(form.avgDailyEarnings) || Number(form.avgDailyEarnings) <= 0)) {
      setMsg('Average daily earnings must be a positive number')
      return
    }

    try {
      setSaving(true)
      await api.put('/user/profile', {
        location: form.location,
        platform: form.occupation,
        occupation: form.occupation,
        deliveryZone: form.deliveryZone || undefined,
        platformId: form.platformId || undefined,
        avgDailyEarnings: form.avgDailyEarnings ? parseFloat(form.avgDailyEarnings) : undefined,
        payoutMethod: form.payoutMethod || undefined,
        payoutHandle: form.payoutHandle || undefined,
        payoutAccountName: form.payoutAccountName || undefined,
        directPayoutConsent: form.directPayoutConsent,
        locationTrackingConsent: form.locationTrackingConsent
      })
      setMsg('Profile updated successfully')
      setEditing(false)
      fetchProfile()
    } catch (err) {
      setMsg(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="dashboard-content"><div className="loading">Loading profile...</div></div>
      </div>
    )
  }

  const rows = [
    ['Full Name', user?.name || '-'],
    ['Email', user?.email || '-'],
    ['Work City', user?.location || 'Not set'],
    ['Delivery Platform', user?.occupation || user?.platform || 'Not set'],
    ['Partner ID', user?.platformId || 'Not set'],
    ['Delivery Zone', user?.deliveryZone || 'Not set'],
    ['Avg Daily Earnings', user?.avgDailyEarnings ? `${Number(user.avgDailyEarnings).toFixed(0)}` : 'Not set'],
    ['Direct payout', user?.directPayoutConsent ? 'Enabled' : 'Not enabled'],
    ['Payout destination', user?.payoutHandle || 'Not set'],
    ['Location tracking', user?.locationTrackingConsent ? 'Enabled' : 'Not enabled'],
    ['Last tracked', user?.lastTrackedAt ? new Date(user.lastTrackedAt).toLocaleString() : 'No location sync yet']
  ]

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">My Account</h2>

        <section className="dashboard-section">
          <div className="info-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Account Details</h3>
              {!editing && (
                <button
                  onClick={() => { setEditing(true); setMsg('') }}
                  style={{ background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Edit
                </button>
              )}
            </div>

            {msg && (
              <div className={msg === 'Profile updated successfully' ? 'success-message' : 'error-message'} style={{ marginBottom: '1rem' }}>
                {msg}
              </div>
            )}

            {!editing ? (
              <div className="info-grid">
                {rows.map(([label, value]) => (
                  <div key={label} className="info-item">
                    <span className="label">{label}</span>
                    <span className="value">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleSave} className="auth-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={user?.name || ''} disabled style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={user?.email || ''} disabled style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>Work City / Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Delivery Platform</label>
                  <select value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} required>
                    <option value="">Select Platform</option>
                    {PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Platform Partner ID</label>
                  <input type="text" value={form.platformId} onChange={(e) => setForm({ ...form, platformId: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Delivery Zone</label>
                  <input type="text" value={form.deliveryZone} onChange={(e) => setForm({ ...form, deliveryZone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Avg Daily Earnings</label>
                  <input type="number" value={form.avgDailyEarnings} onChange={(e) => setForm({ ...form, avgDailyEarnings: e.target.value })} min="100" max="5000" />
                </div>

                <div className="info-card" style={{ marginBottom: '1rem', background: '#f8fbff' }}>
                  <h3 style={{ marginBottom: '0.75rem' }}>Direct payment to the delivery partner</h3>
                  <p style={{ color: '#666', fontSize: 13, marginBottom: '0.75rem' }}>
                    Approved claims go directly to the delivery partner payout destination. No third-party involvement.
                  </p>
                  <div className="form-group">
                    <label>Payout Method</label>
                    <select value={form.payoutMethod} onChange={(e) => setForm({ ...form, payoutMethod: e.target.value })}>
                      <option value="UPI">UPI</option>
                      <option value="BANK_TRANSFER">Bank transfer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{form.payoutMethod === 'UPI' ? 'UPI ID' : 'Bank transfer reference'}</label>
                    <input type="text" value={form.payoutHandle} onChange={(e) => setForm({ ...form, payoutHandle: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Account Holder Name</label>
                    <input type="text" value={form.payoutAccountName} onChange={(e) => setForm({ ...form, payoutAccountName: e.target.value })} />
                  </div>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                    <input type="checkbox" checked={form.directPayoutConsent} onChange={(e) => setForm({ ...form, directPayoutConsent: e.target.checked })} />
                    <span>I confirm direct payment to the delivery partner with no third-party involvement.</span>
                  </label>
                </div>

                <div className="info-card" style={{ marginBottom: '1rem', background: '#f8fbff' }}>
                  <h3 style={{ marginBottom: '0.75rem' }}>Tracking the location of the delivery partner</h3>
                  <p style={{ color: '#666', fontSize: 13, marginBottom: '0.75rem' }}>
                    We use consented location tracking to verify trigger zones, match local weather and AQI, and reduce spoofing-based fraud.
                  </p>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                    <input type="checkbox" checked={form.locationTrackingConsent} onChange={(e) => setForm({ ...form, locationTrackingConsent: e.target.checked })} />
                    <span>I consent to location tracking for trigger verification and fair payout processing.</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="submit-btn" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" className="action-btn cancel" onClick={() => { setEditing(false); setMsg('') }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="info-card">
            <h3>Security</h3>
            <p style={{ color: '#666', fontSize: 14, marginBottom: '1rem' }}>
              Want to change your password?
            </p>
            <Link to="/forgot-password">
              <button className="action-btn activate">Reset Password</button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProfilePage
