import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/authService'
import '../styles/dashboard.css'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    platform: '',
    workCity: '',
    averageDailyIncome: '',
    payoutMethod: 'UPI',
    payoutHandle: '',
    payoutAccountName: '',
    directPayoutConsent: true,
    locationTrackingConsent: true,
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.fullName || !formData.platform || !formData.workCity ||
        !formData.averageDailyIncome || !formData.email || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const income = parseFloat(formData.averageDailyIncome)
    if (isNaN(income) || income <= 0 || income > 5000) {
      setError('Average daily income must be between 1 and 5000')
      return
    }

    try {
      setLoading(true)
      const userData = await registerUser({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        platform: formData.platform,
        location: formData.workCity,
        avgDailyEarnings: income,
        payoutMethod: formData.payoutMethod,
        payoutHandle: formData.payoutHandle || undefined,
        payoutAccountName: formData.payoutAccountName || undefined,
        directPayoutConsent: formData.directPayoutConsent,
        locationTrackingConsent: formData.locationTrackingConsent
      })

      localStorage.setItem('user', JSON.stringify(userData))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h2>Get Insured Today</h2>
          <p className="auth-subtitle">Protect your delivery income from weather disruptions</p>
        </div>

        {error && <div className="error-message">❌ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Delivery Platform</label>
            <select
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              required
            >
              <option value="">Select Platform</option>
              {PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Work City</label>
            <input
              type="text"
              name="workCity"
              value={formData.workCity}
              onChange={handleChange}
              placeholder="e.g. Chennai, Mumbai, Delhi"
              required
            />
          </div>

          <div className="form-group">
            <label>Average Daily Income</label>
            <input
              type="number"
              name="averageDailyIncome"
              value={formData.averageDailyIncome}
              onChange={handleChange}
              placeholder="e.g. 700"
              min="1"
              max="5000"
              required
            />
            <small style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
              Used to calculate your income-loss payout accurately
            </small>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min 8 characters)"
              required
            />
          </div>

          <div style={{
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
            border: '2px solid #667eea30',
            borderRadius: '12px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>💳</span>
              <strong style={{ fontSize: '14px' }}>Payout destination</strong>
              <span style={{ fontSize: 11, color: '#667eea', marginLeft: 'auto' }}>needed to receive claims</span>
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <select
                name="payoutMethod"
                value={formData.payoutMethod}
                onChange={handleChange}
              >
                <option value="UPI">📱 UPI (fastest)</option>
                <option value="BANK_TRANSFER">🏦 Bank transfer</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                name="payoutHandle"
                value={formData.payoutHandle}
                onChange={handleChange}
                placeholder={formData.payoutMethod === 'UPI' ? 'yourname@upi' : 'Account number or IBAN'}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                type="text"
                name="payoutAccountName"
                value={formData.payoutAccountName}
                onChange={handleChange}
                placeholder="Name on account"
              />
            </div>
          </div>

          <label style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            fontSize: '13px',
            background: '#e3f2fd',
            padding: '0.75rem',
            borderRadius: '8px',
            cursor: 'pointer',
            border: '1px solid #bbdefb',
            marginBottom: '1.5rem'
          }}>
            <input
              type="checkbox"
              checked={formData.locationTrackingConsent}
              onChange={(e) => setFormData({ ...formData, locationTrackingConsent: e.target.checked })}
              style={{ marginTop: '2px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '500' }}>📍 I consent to location tracking for faster claim verification.</span>
          </label>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '⏳ Creating your account...' : '✨ Get Insured'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
