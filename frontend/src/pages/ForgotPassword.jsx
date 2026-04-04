import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import '../styles/dashboard.css'

const ForgotPassword = () => {
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Please enter your email address'); return }

    try {
      setLoading(true)
      await api.post('/auth/forgot-password', { email })
      setSubmitted(true)
    } catch (err) {
      // Always show the same message — prevent email enumeration on the frontend too
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>

        {!submitted ? (
          <>
            <p className="auth-subtitle">
              Enter your email and we'll send you a reset link.
            </p>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📧</div>
            <div className="success-message" style={{ marginBottom: '1rem' }}>
              Check your email for a reset link.
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              If an account exists for <strong>{email}</strong>, a reset link has been sent.
              It expires in 1 hour.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Didn't get it? Check your spam folder, or{' '}
              <button
                style={{ background: 'none', border: 'none', color: 'var(--color-text-info)', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                onClick={() => { setSubmitted(false); setEmail('') }}
              >
                try again
              </button>.
            </p>
          </div>
        )}

        <p className="auth-link">
          Remember your password? <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
