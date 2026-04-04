const express    = require('express')
const rateLimit  = require('express-rate-limit')
const { getDashboardData, updateProfile } = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')

const router = express.Router()

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      20,
  message:  { message: 'Too many profile update requests. Please try again in 15 minutes.' }
})

router.get('/dashboard', protect, getDashboardData)
router.put('/profile', protect, profileLimiter, updateProfile)

module.exports = router