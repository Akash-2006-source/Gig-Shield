const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const path = require('path')
const { connectDB } = require('./config/db')
const { processAutomaticClaims } = require('./services/triggerService')
const { renewExpiringPolicies }  = require('./services/policyRenewalService')

dotenv.config({ path: '../.env' })

// Validate required env vars at startup
const required = ['JWT_SECRET', 'FRONTEND_URL']
required.forEach(key => {
  if (!process.env[key] || process.env[key].includes('your-')) {
    if (key === 'FRONTEND_URL' && process.env.NODE_ENV === 'production') {
      console.error(`ERROR: ${key} must be set in production — CORS will block all browser requests`)
      process.exit(1)
    }
    console.warn(`WARNING: Environment variable ${key} is missing or still a placeholder`)
  }
})
;['STRIPE_SECRET_KEY', 'OPENWEATHER_API_KEY'].forEach(key => {
  if (!process.env[key] || process.env[key].includes('your-')) {
    console.warn(`WARNING: ${key} not configured — related features will use fallback/mock mode`)
  }
})

require('./models/User')
require('./models/Policy')
require('./models/Claim')
require('./models/RiskZone')

connectDB()

const app = express()

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

// Health check — used by start-dev.ps1 and deployment monitors
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), env: process.env.NODE_ENV || 'development' })
})

app.use('/api/auth',     require('./routes/authRoutes'))
app.use('/api/policies', require('./routes/policyRoutes'))
app.use('/api/claims',   require('./routes/claimRoutes'))
app.use('/api/payments', require('./routes/paymentRoutes'))
app.use('/api/admin',    require('./routes/adminRoutes'))
app.use('/api/user',     require('./routes/userRoutes'))

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))
  // SPA fallback — exclude /api routes
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
  })
}

// Global error handler
app.use((err, req, res, next) => {
  const status  = err.statusCode || 500
  const message = err.message    || 'Internal server error'
  if (process.env.NODE_ENV !== 'production') console.error(err.stack)
  res.status(status).json({ message })
})

const PORT = process.env.PORT || 5001

app.listen(PORT, () => {
  console.log(`GigShield backend running on port ${PORT}`)
})

// ── Background jobs ───────────────────────────────────────────────────────────
// FIX 🟠10: env flag prevents hammering weather API on every dev restart
const DISABLE_JOBS = process.env.DISABLE_BACKGROUND_JOBS === 'true'

if (DISABLE_JOBS) {
  console.log('[jobs] Background jobs disabled (DISABLE_BACKGROUND_JOBS=true)')
} else {
  // Run parametric claim check on startup (after 5s delay for DB to settle)
  setTimeout(processAutomaticClaims, 5000)
  // Then every hour
  setInterval(processAutomaticClaims, 60 * 60 * 1000)

  // FIX 🟠10: policy auto-renewal — runs every 6 hours, renews expiring policies
  setTimeout(renewExpiringPolicies, 10000)
  setInterval(renewExpiringPolicies, 6 * 60 * 60 * 1000)

  console.log('[jobs] Parametric claim check: every 60 minutes')
  console.log('[jobs] Policy auto-renewal check: every 6 hours')
}
