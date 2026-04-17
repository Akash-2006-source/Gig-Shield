const express = require('express')
const {
  getDashboardStats,
  getRiskZones,
  updateRiskZone,
  getFraudAlerts,
  getAllWorkers,
  reactivatePolicy,
  getReserveHealth,
  setClaimLabel,
  getTrainingData,
  getClaimsForLabeling,
  getLabelStats
} = require('../controllers/adminController')
const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/dashboard',    protect, admin, getDashboardStats)
router.get('/risk-zones',   protect, admin, getRiskZones)
router.put('/risk-zones',   protect, admin, updateRiskZone)
router.get('/fraud-alerts', protect, admin, getFraudAlerts)
router.get('/workers',      protect, admin, getAllWorkers)
router.get('/reserves',     protect, admin, getReserveHealth)

// Policy reactivation — un-suspend a policy frozen by premium-collection retries
router.post('/policies/:id/reactivate', protect, admin, reactivatePolicy)

// Phase 5 — supervised training pipeline
// Label a claim post-hoc for ML training data. Body: { label, reason? }.
router.post('/claims/:id/label',  protect, admin, setClaimLabel)
// Claim queue for the labeling dashboard (unlabeled first).
router.get('/claims/labeling',    protect, admin, getClaimsForLabeling)
// Label distribution + training-readiness summary.
router.get('/claims/label-stats', protect, admin, getLabelStats)
// Export the labeled dataset with feature snapshots joined.
router.get('/training-data',      protect, admin, getTrainingData)

// Background job admin endpoints live at /api/admin/jobs/* — see routes/admin/jobs.js

module.exports = router
