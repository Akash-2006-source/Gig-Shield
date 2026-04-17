const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const deviceFingerprintService = require('../services/deviceFingerprintService')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UPI_RE = /^[\w.\-]{2,}@[A-Za-z]{2,}$/
const VALID_PLATFORMS = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']

const trackDevice = async (userId, req) => {
  try {
    const deviceId = req.body?.deviceId || req.get('x-device-id') || null
    const ip = req.ip || req.connection?.remoteAddress || null

    await deviceFingerprintService.upsertDevice(userId, {
      deviceId,
      userAgent: req.get('user-agent') || null,
      ip,
      fingerprintData: req.body?.fingerprintData || {}
    })
  } catch (err) {
    console.warn(`[authController] device track failed: ${err.message}`)
  }
}

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

const validateRegister = ({ name, email, password }) => {
  if (!name || !email || !password) return 'name, email and password are required'
  if (name.trim().length < 2) return 'Name must be at least 2 characters'
  if (name.trim().length > 100) return 'Name must not exceed 100 characters'
  if (!EMAIL_RE.test(email)) return 'Please provide a valid email address'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 128) return 'Password must not exceed 128 characters'
  return null
}

const validateLogin = ({ email, password }) => {
  if (!email || !password) return 'email and password are required'
  if (!EMAIL_RE.test(email)) return 'Please provide a valid email address'
  return null
}

exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      platform,
      location,
      avgDailyEarnings,
      payoutMethod,
      payoutHandle,
      payoutAccountName,
      directPayoutConsent,
      locationTrackingConsent
    } = req.body

    const validationError = validateRegister({ name, email, password })
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    if (platform && !VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({ message: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` })
    }

    if (avgDailyEarnings !== undefined) {
      const val = parseFloat(avgDailyEarnings)
      if (isNaN(val) || val <= 0 || val > 5000) {
        return res.status(400).json({ message: 'avgDailyEarnings must be between 1 and 5000' })
      }
    }

    if (payoutMethod && !['UPI', 'BANK_TRANSFER'].includes(payoutMethod)) {
      return res.status(400).json({ message: 'payoutMethod must be UPI or BANK_TRANSFER' })
    }

    if (payoutMethod === 'UPI' && payoutHandle && !UPI_RE.test(String(payoutHandle).trim())) {
      return res.status(400).json({ message: 'Please provide a valid UPI ID' })
    }

    const normalizedEmail = email.toLowerCase()
    const userExists = await User.findOne({ where: { email: normalizedEmail } })
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10))

    const createData = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    }

    if (platform) createData.platform = platform
    if (location) createData.location = location
    if (avgDailyEarnings) createData.avgDailyEarnings = parseFloat(avgDailyEarnings)
    if (payoutMethod) createData.payoutMethod = payoutMethod
    if (payoutHandle) createData.payoutHandle = String(payoutHandle).trim()
    if (payoutAccountName) createData.payoutAccountName = String(payoutAccountName).trim()
    if (directPayoutConsent !== undefined) createData.directPayoutConsent = Boolean(directPayoutConsent)
    if (locationTrackingConsent !== undefined) createData.locationTrackingConsent = Boolean(locationTrackingConsent)

    const user = await User.create(createData)

    trackDevice(user.id, req)

    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      platform: user.platform,
      location: user.location,
      payoutMethod: user.payoutMethod,
      payoutHandle: user.payoutHandle,
      directPayoutConsent: user.directPayoutConsent,
      locationTrackingConsent: user.locationTrackingConsent,
      token: generateToken(user.id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    const validationError = validateLogin({ email, password })
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    trackDevice(user.id, req)

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      platform: user.platform,
      location: user.location,
      payoutMethod: user.payoutMethod,
      payoutHandle: user.payoutHandle,
      directPayoutConsent: user.directPayoutConsent,
      locationTrackingConsent: user.locationTrackingConsent,
      token: generateToken(user.id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
