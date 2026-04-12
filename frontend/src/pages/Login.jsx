import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { loginUser } from '../services/authService'
import '../styles/dashboard.css'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || null
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      // FIX: actually call the real API instead of mocking it
      const data = await loginUser(formData.email, formData.password)

      // Save full user object including token to localStorage
      localStorage.setItem('user', JSON.stringify(data))

      // Redirect back to where they came from, or role-based default
      if (from) {
        navigate(from)
      } else if (data.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card-modern">
        <div className="auth-card-header">
          <div className="auth-logo">🛡️</div>
          <h2>Welcome Back</h2>
          <p className="auth-subtitle-modern">Sign in to access your income protection dashboard</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form-modern">
          <div className="form-group-modern">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="form-input"
              required
            />
          </div>

          <div className="form-group-modern">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="form-input"
              required
            />
          </div>

          <button type="submit" className="submit-btn-modern" disabled={loading}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-link">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
          <p className="auth-link">
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login