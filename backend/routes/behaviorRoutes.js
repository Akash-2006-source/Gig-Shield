const express = require('express')
const { protect } = require('../middleware/authMiddleware')
const { behaviorLimiter } = require('../middleware/security')
const { ingestEvent } = require('../controllers/behaviorController')

const router = express.Router()

// All behavior routes require auth + carry a per-IP rate limit.
router.use(protect)
router.use(behaviorLimiter)

router.post('/ingest', ingestEvent)

module.exports = router
