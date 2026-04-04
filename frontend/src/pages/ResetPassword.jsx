import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import '../styles/dashboard.css'

const ResetPassword = () => {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const [form, setForm] = useState({
    token:           params.get('token') || '',
    newPassword:     '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.token) {
      setError('Reset token is missing. Use the link from your email.')
      return
    }
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      await api.post('/auth/reset-password', {
        token:       form.token,
        newPassword: form.newPassword
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✅</div>
            <div className="success-message">
              Password reset successful! Redirecting to login...
            </div>
          </div>
        ) : (
          <>
            <p className="auth-subtitle">Choose a new password for your account.</p>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="auth-form">
              {/* Only show token field if it wasn't in the URL */}
              {!params.get('token') && (
                <div className="form-group">
                  <label>Reset Token</label>
                  <input
                    type="text"
                    name="token"
                    value={form.token}
                    onChange={handleChange}
                    placeholder="Paste the token from your email"
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your new password"
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <p className="auth-link">
          <Link to="/forgot-password">← Request a new link</Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
