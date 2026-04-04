import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/authService'
import '../styles/dashboard.css'

const PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName:           '',
    platform:           '',
    workCity:           '',
    averageDailyIncome: '',
    email:              '',
    password:           ''
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.fullName || !formData.platform || !formData.workCity ||
        !formData.averageDailyIncome || !formData.email || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const income = parseFloat(formData.averageDailyIncome)
    if (isNaN(income) || income <= 0 || income > 5000) {
      setError('Average daily income must be between ₹1 and ₹5,000')
      return
    }

    try {
      setLoading(true)
      const userData = await registerUser({
        name:             formData.fullName,
        email:            formData.email,
        password:         formData.password,
        platform:         formData.platform,
        location:         formData.workCity,
        avgDailyEarnings: income
      })

      // Store user in localStorage so they're immediately logged in
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
        <h2>Register as Delivery Partner</h2>

        {error && <div className="error-message">{error}</div>}

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
              {PLATFORMS.map(p => (
                <option key={p} value={p}>{p}</option>
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
            <label>Average Daily Income (₹)</label>
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

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
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
