const crypto  = require('crypto')
const bcrypt  = require('bcryptjs')
const User    = require('../models/User')

// ── Email helper (Nodemailer + env-configured SMTP) ───────────────────────────
// Set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / EMAIL_FROM in .env
// If not configured, falls back to logging the link (safe for local dev)
const sendResetEmail = async (to, resetLink) => {
  const host = process.env.SMTP_HOST
  if (!host) {
    console.log(`[passwordReset] EMAIL NOT CONFIGURED — reset link for ${to}:`)
    console.log(`[passwordReset] ${resetLink}`)
    return
  }

  const nodemailer = require('nodemailer')
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || '"GigShield" <noreply@gigshield.in>',
    to,
    subject: 'Reset your GigShield password',
    html: `
      <p>You requested a password reset for your GigShield account.</p>
      <p><a href="${resetLink}" style="background:#667eea;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Reset Password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `
  })
}

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } })

    // Always return success — prevents email enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' })
    }

    const resetToken       = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await user.update({ resetToken, resetTokenExpiry })

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const resetLink   = `${frontendUrl}/reset-password?token=${resetToken}`

    await sendResetEmail(user.email, resetLink)

    // Never expose the token in the response
    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (error) {
    console.error('[passwordReset] forgotPassword error:', error)
    res.status(500).json({ message: 'Failed to process reset request' })
  }
}

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' })
    }

    // Unified min-length — matches authController registration requirement
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ message: 'Password must not exceed 128 characters' })
    }

    const user = await User.findOne({ where: { resetToken: token } })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    if (new Date() > new Date(user.resetTokenExpiry)) {
      await user.update({ resetToken: null, resetTokenExpiry: null })
      return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' })
    }

    const salt           = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await user.update({
      password:         hashedPassword,
      resetToken:       null,
      resetTokenExpiry: null
    })

    res.json({ message: 'Password reset successful. You can now log in.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
