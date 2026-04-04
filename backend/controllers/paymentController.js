/**
 * paymentController.js
 * --------------------
 * Razorpay payment gateway integration for GigShield weekly policy premiums.
 *
 * Flow:
 *  1. POST /api/payments/create-order  → creates Razorpay order, returns order_id
 *  2. Frontend opens Razorpay checkout with order_id
 *  3. Worker pays via UPI / card / wallet
 *  4. POST /api/payments/verify        → verifies signature, activates policy
 *  5. POST /api/payments/payout        → admin-only mock payout disbursement
 *
 * Sandbox keys: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
 * Get free test keys at: https://dashboard.razorpay.com/app/keys
 */

const crypto = require('crypto')
const Policy = require('../models/Policy')
const Claim  = require('../models/Claim')

const getRazorpay = () => {
  const keyId     = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret || keyId.includes('your_') || keySecret.includes('your_')) {
    return null  // sandbox/demo mode
  }

  const Razorpay = require('razorpay')
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

// ── 1. Create Razorpay order ──────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { policyId } = req.body
    if (!policyId) return res.status(400).json({ message: 'policyId is required' })

    const policy = await Policy.findByPk(policyId)
    if (!policy) return res.status(404).json({ message: 'Policy not found' })
    if (policy.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized' })

    const amountPaise = Math.round(parseFloat(policy.premium) * 100)  // paise

    const razorpay = getRazorpay()

    // ── Demo / sandbox mode ───────────────────────────────────────────────────
    if (!razorpay) {
      const demoOrder = {
        id:          `order_DEMO_${Date.now()}`,
        amount:      amountPaise,
        currency:    'INR',
        receipt:     `receipt_${policyId}_${Date.now()}`,
        status:      'created',
        demo:        true,
        keyId:       'rzp_test_demo',
        policyId:    policy.id,
        planType:    policy.type,
        description: `Gig_Worker ${policy.type} Plan — Weekly Premium`
      }
      return res.json(demoOrder)
    }

    // ── Live / test Razorpay ──────────────────────────────────────────────────
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  `receipt_${policyId}_${Date.now()}`,
      notes: {
        policyId: String(policy.id),
        userId:   String(req.user.id),
        planType: policy.type
      }
    })

    res.json({
      ...order,
      keyId:       process.env.RAZORPAY_KEY_ID,
      policyId:    policy.id,
      planType:    policy.type,
      description: `Gig_Worker ${policy.type} Plan — Weekly Premium`,
      userName:    req.user.name,
      userEmail:   req.user.email
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── 2. Verify payment & activate policy ──────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, policyId } = req.body

    if (!policyId) return res.status(400).json({ message: 'policyId is required' })

    const policy = await Policy.findByPk(policyId)
    if (!policy) return res.status(404).json({ message: 'Policy not found' })
    if (policy.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized' })

    // ── Demo mode — skip signature verification ───────────────────────────────
    const isDemoOrder = razorpay_order_id?.startsWith('order_DEMO_')
    if (!isDemoOrder) {
      const keySecret = process.env.RAZORPAY_KEY_SECRET
      if (!keySecret || keySecret.includes('your_')) {
        return res.status(400).json({ message: 'Razorpay not configured' })
      }

      // Verify HMAC-SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: 'Payment verification failed — invalid signature' })
      }
    }

    // Mark policy as paid and active
    await policy.update({ status: 'active' })

    res.json({
      success:   true,
      message:   'Payment verified. Policy is now active.',
      policyId:  policy.id,
      planType:  policy.type,
      premium:   policy.premium,
      coverage:  policy.coverage,
      validUntil:policy.endDate,
      paymentId: razorpay_payment_id || 'demo_payment'
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── 3. Mock payout disbursement (after claim approval) ───────────────────────
exports.disbursePayout = async (req, res) => {
  try {
    const { claimId, upiId, amount } = req.body

    if (!claimId || !upiId || !amount) {
      return res.status(400).json({ message: 'claimId, upiId and amount are required' })
    }

    // Basic UPI ID validation
    const UPI_RE = /^[\w.\-]+@[\w]+$/
    if (!UPI_RE.test(upiId)) {
      return res.status(400).json({ message: 'Invalid UPI ID format (e.g. name@upi)' })
    }

    // In production: call Razorpay Payout API
    const mockPayout = {
      payoutId:      `PAYOUT-${Date.now()}`,
      claimId,
      recipientUpi:  upiId,
      amountINR:     parseFloat(amount),
      status:        'processing',
      estimatedTime: '2–4 hours',
      initiatedAt:   new Date().toISOString(),
      message:       `₹${amount} income-loss payout initiated to ${upiId}`
    }

    console.log(`[payment] Payout: claimId=${claimId} upi=${upiId} amount=₹${amount}`)
    res.json(mockPayout)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}