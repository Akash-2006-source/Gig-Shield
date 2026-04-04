const express = require('express')
const { createOrder, verifyPayment, disbursePayout } = require('../controllers/paymentController')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/create-order', protect, createOrder)    // step 1 — create Razorpay order
router.post('/verify',       protect, verifyPayment)  // step 2 — verify & activate policy
router.post('/payout',       protect, admin, disbursePayout)  // admin — disburse claim payout

module.exports = router