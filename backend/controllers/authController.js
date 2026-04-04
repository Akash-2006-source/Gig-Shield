const jwt    = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User   = require('../models/User')

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

// ── Validation helpers ────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validateRegister = ({ name, email, password }) => {
  if (!name || !email || !password)         return 'name, email and password are required'
  if (name.trim().length < 2)               return 'Name must be at least 2 characters'
  if (name.trim().length > 100)             return 'Name must not exceed 100 characters'
  if (!EMAIL_RE.test(email))                return 'Please provide a valid email address'
  if (password.length < 8)                  return 'Password must be at least 8 characters'
  if (password.length > 128)               return 'Password must not exceed 128 characters'
  return null
}

const validateLogin = ({ email, password }) => {
  if (!email || !password)    return 'email and password are required'
  if (!EMAIL_RE.test(email))  return 'Please provide a valid email address'
  return null
}

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, platform, location, avgDailyEarnings } = req.body

    const validationError = validateRegister({ name, email, password })
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    // Validate platform if provided
    const validPlatforms = ['Zomato', 'Swiggy', 'Zepto', 'Blinkit', 'Amazon', 'Flipkart', 'Other']
    if (platform && !validPlatforms.includes(platform)) {
      return res.status(400).json({ message: `platform must be one of: ${validPlatforms.join(', ')}` })
    }

    // Validate avgDailyEarnings if provided
    if (avgDailyEarnings !== undefined) {
      const val = parseFloat(avgDailyEarnings)
      if (isNaN(val) || val <= 0 || val > 5000) {
        return res.status(400).json({ message: 'avgDailyEarnings must be between ₹1 and ₹5,000' })
      }
    }

    const userExists = await User.findOne({ where: { email: email.toLowerCase() } })
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' })
    }

    const salt           = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const createData = {
      name:     name.trim(),
      email:    email.toLowerCase(),
      password: hashedPassword
    }
    if (platform)          createData.platform          = platform
    if (location)          createData.location          = location
    if (avgDailyEarnings)  createData.avgDailyEarnings  = parseFloat(avgDailyEarnings)

    const user = await User.create(createData)

    res.status(201).json({
      _id:              user.id,
      name:             user.name,
      email:            user.email,
      role:             user.role,
      platform:         user.platform,
      location:         user.location,
      avgDailyEarnings: user.avgDailyEarnings,
      token:            generateToken(user.id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
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

    res.json({
      _id:              user.id,
      name:             user.name,
      email:            user.email,
      role:             user.role,
      platform:         user.platform,
      location:         user.location,
      avgDailyEarnings: user.avgDailyEarnings,
      token:            generateToken(user.id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}