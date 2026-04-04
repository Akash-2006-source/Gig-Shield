const User    = require('../models/User')
const Policy  = require('../models/Policy')
const Claim   = require('../models/Claim')
const RiskZone = require('../models/RiskZone')
const { getFraudAssessment } = require('../services/mlService')
const { Op, fn, col } = require('sequelize')

// ── Dashboard stats with actuarial metrics ───────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const workersInsured = await User.count({ where: { role: 'worker' } })
    const activePolicies = await Policy.count({ where: { status: 'active' } })

    const totalPremiumResult = await Policy.sum('premium', { where: { status: 'active' } })
    const totalPremium = totalPremiumResult || 0

    const totalPayoutResult = await Claim.sum('amount', { where: { status: 'approved' } })
    const totalPayout = totalPayoutResult || 0

    const flaggedCount = await Claim.count({ where: { status: 'flagged' } })

    const today    = new Date(); today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const weekAgo  = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

    const claimsToday    = await Claim.count({ where: { submittedAt: { [Op.gte]: today, [Op.lt]: tomorrow } } })
    const claimsThisWeek = await Claim.count({ where: { submittedAt: { [Op.gte]: weekAgo } } })

    const lossRatio     = totalPremium > 0 ? (totalPayout / totalPremium) : 0
    const estimatedOps  = totalPremium * 0.18
    const combinedRatio = totalPremium > 0 ? ((totalPayout + estimatedOps) / totalPremium) : 0

    const claimsByType = await Claim.findAll({
      where:      { submittedAt: { [Op.gte]: weekAgo }, triggerType: { [Op.ne]: null } },
      attributes: ['triggerType', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('amount')), 'total']],
      group:      ['triggerType'],
      raw:        true
    })

    res.json({
      platformMetrics: {
        workersInsured,
        activePolicies,
        totalPremium:    Math.round(totalPremium),
        totalPayout:     Math.round(totalPayout),
        flaggedClaims:   flaggedCount,
        lossRatio:       parseFloat((lossRatio * 100).toFixed(1)),
        combinedRatio:   parseFloat((combinedRatio * 100).toFixed(1)),
        targetLossRatio: 65,
        fraudSavings:    0
      },
      claimsOverview: {
        claimsToday,
        claimsThisWeek,
        totalPayout:  Math.round(totalPayout),
        claimsByType
      }
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Risk zones ────────────────────────────────────────────────────────────────
exports.getRiskZones = async (req, res) => {
  try {
    const riskZones = await RiskZone.findAll()
    res.json(riskZones)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateRiskZone = async (req, res) => {
  try {
    const { location, riskLevel, weatherConditions } = req.body
    const [riskZone] = await RiskZone.upsert({ location, riskLevel, weatherConditions }, { returning: true })
    res.json(riskZone)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── Fraud alerts — uses mlService (same as claimController) for consistency ──
exports.getFraudAlerts = async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const recentClaims = await Claim.findAll({
      where:   { submittedAt: { [Op.gte]: weekAgo } },
      include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
    })

    // Group by user
    const byUser = {}
    recentClaims.forEach(c => {
      if (!byUser[c.userId]) byUser[c.userId] = []
      byUser[c.userId].push(c)
    })

    const fraudAlerts = []

    for (const [userId, claims] of Object.entries(byUser)) {
      const latestClaim = claims[0]
      const policy = await Policy.findOne({ where: { userId, status: 'active' } })
      if (!policy) continue

      // Use same getFraudAssessment as claimController for consistent scoring
      const fraudResult = await getFraudAssessment({
        amount:           parseFloat(latestClaim.amount),
        policyCoverage:   parseFloat(policy.coverage),
        claimCount30Days: claims.length
      })

      if (fraudResult.riskScore > 0) {
        fraudAlerts.push({
          id:         `fraud-${userId}-${Date.now()}`,
          userId,
          userName:   latestClaim.user?.name,
          claimCount: claims.length,
          riskScore:  fraudResult.riskScore,
          severity:   fraudResult.riskScore > 50 ? 'high' : fraudResult.riskScore > 20 ? 'medium' : 'low',
          type:       fraudResult.isFraudulent ? 'Suspicious pattern detected' : 'Elevated risk score',
          reasons:    fraudResult.reasons,
          details:    `${claims.length} claims in last 7 days`
        })
      }
    }

    fraudAlerts.sort((a, b) => b.riskScore - a.riskScore)
    res.json(fraudAlerts)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── All workers with policies (paginated) ─────────────────────────────────────
exports.getAllWorkers = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1)
    const limit  = Math.min(100, parseInt(req.query.limit) || 20)
    const offset = (page - 1) * limit

    const { count, rows } = await User.findAndCountAll({
      where:      { role: 'worker' },
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] },
      include:    [{ model: Policy, as: 'policies', where: { status: 'active' }, required: false }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    })

    res.json({ workers: rows, total: count, page, totalPages: Math.ceil(count / limit) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
