/**
 * premiumCalculator.js
 * --------------------
 * Two-layer premium engine for GigShield parametric income protection.
 *
 * LAYER 1 — Actuarial reference price
 *   Pure Risk Premium = Σ (trigger_frequency × trigger_probability × severity_fraction × daily_earnings)
 *   Gross = pure / (1 − total_loadings)
 *   Used internally for loss ratio reporting. NOT shown to workers as their price.
 *
 * LAYER 2 — Worker contribution price (what the worker actually pays)
 *   = fixed % of weekly earnings, capped per tier.
 *   Affordable, transparent, and scales with income — just like a payroll deduction.
 *
 *   Tier        Contribution   At ₹700/day    Coverage cap
 *   ─────────── ─────────────  ─────────────  ────────────
 *   Basic        2.0%          ₹98/week       ₹2,500
 *   Standard     3.5%          ₹172/week      ₹3,500   ← recommended
 *   Pro          5.0%          ₹245/week      ₹5,000
 *
 * The gap between actuarial gross and contribution price is the "affordability subsidy"
 * — intended to be closed by platform partnerships (Zomato/Swiggy co-contributions)
 * or cross-subsidisation from low-risk cities to high-risk ones.
 *
 * All amounts in Indian Rupees (₹). Weekly pricing matches delivery partner pay cycles.
 */

// ── Disruption frequency (disruption-days per month) ─────────────────────────
// Source: 5-year IMD rainfall data + CPCB AQI records + cyclone alerts database
const CITY_FREQUENCY = {
  Chennai:   { rain: 3.8, heat: 1.2, aqi: 2.1, cyclone: 0.4, curfew: 0.2 },
  Mumbai:    { rain: 4.2, heat: 0.8, aqi: 1.8, cyclone: 0.3, curfew: 0.2 },
  Delhi:     { rain: 1.6, heat: 3.4, aqi: 5.2, cyclone: 0.0, curfew: 0.3 },
  Bengaluru: { rain: 2.4, heat: 0.4, aqi: 1.2, cyclone: 0.0, curfew: 0.1 },
  Hyderabad: { rain: 2.1, heat: 1.8, aqi: 1.4, cyclone: 0.1, curfew: 0.1 },
  Pune:      { rain: 1.8, heat: 0.6, aqi: 0.9, cyclone: 0.0, curfew: 0.1 },
  Kolkata:   { rain: 3.6, heat: 1.4, aqi: 2.8, cyclone: 0.5, curfew: 0.2 },
  Ahmedabad: { rain: 1.4, heat: 4.2, aqi: 2.1, cyclone: 0.1, curfew: 0.1 },
  default:   { rain: 2.0, heat: 1.0, aqi: 1.5, cyclone: 0.1, curfew: 0.2 }
}

// ── Trigger threshold probability ─────────────────────────────────────────────
// Not every "rain day" crosses ≥50mm. These factors discount raw frequency
// to only days that actually breach the parametric trigger threshold.
const TRIGGER_PROBABILITY = {
  rain:    0.40,  // 40% of rain days reach ≥50mm/3hr
  heat:    0.60,  // 60% of hot days sustain ≥42°C
  aqi:     0.70,  // 70% of poor-air days hit CPCB ≥200
  cyclone: 0.80,  // 80% of cyclone alerts disrupt operations
  curfew:  0.90   // 90% of curfew days are full shutdowns
}

// ── Income loss fraction per trigger (as proportion of daily earnings) ────────
// rain: full day lost (6hrs gone), heat: ~4hrs peak lost, aqi: ~3hrs, etc.
const SEVERITY_FRACTION = {
  rain:    1.00,
  heat:    0.67,
  aqi:     0.50,
  cyclone: 1.50,  // full day + disruption next morning
  curfew:  1.00
}

// ── Actuarial loading factors ─────────────────────────────────────────────────
const LOADINGS = {
  expense:      0.18,
  reinsurance:  0.08,
  profit:       0.12,
  fraudReserve: 0.05,
  catReserve:   0.03,
  regulatory:   0.02
}
const TOTAL_LOADING = Object.values(LOADINGS).reduce((s, v) => s + v, 0)  // 0.48

// ── Plan definitions ──────────────────────────────────────────────────────────
// Coverage cap scales with the worker's weekly earnings — same multiplier as contribution rate.
// This ensures the product always makes sense: a ₹1,000/day worker gets proportionally more coverage.
//   Basic:    2×  weekly earnings  (e.g. ₹700/day → ₹9,800 cap)
//   Standard: 3.5× weekly earnings (e.g. ₹700/day → ₹17,150 cap)
//   Pro:      5×  weekly earnings  (e.g. ₹700/day → ₹24,500 cap)
const PLAN_COVERAGE_MULTIPLIER = {
  Basic:    2.0,
  Standard: 3.5,
  Pro:      5.0
}

// Static fallback caps (used when avgDailyEarnings is not known, e.g. legacy code)
const PLAN_COVERAGE = {
  Basic:    9800,
  Standard: 17150,
  Pro:      24500
}

const PLAN_TRIGGERS = {
  Basic:    ['rain', 'aqi'],
  Standard: ['rain', 'aqi', 'heat', 'cyclone'],
  Pro:      ['rain', 'aqi', 'heat', 'cyclone', 'curfew']
}

// ── Contribution rates (% of weekly earnings) ─────────────────────────────────
// These are the prices workers actually see and pay.
const CONTRIBUTION_RATE = {
  Basic:    0.020,   // 2.0%
  Standard: 0.035,   // 3.5%
  Pro:      0.050    // 5.0%
}

// ── City risk band (for contribution display) ─────────────────────────────────
const CITY_RISK_BAND = {
  Chennai: 'high', Mumbai: 'high', Delhi: 'high', Kolkata: 'high',
  Hyderabad: 'medium', Ahmedabad: 'medium',
  Bengaluru: 'low', Pune: 'low'
}

// ── Internal: actuarial pure risk premium ─────────────────────────────────────
// Used for loss ratio reporting, NOT for worker-facing pricing.
const _calcActuarialPure = (city, planType, avgDailyEarnings) => {
  const freq     = CITY_FREQUENCY[city] || CITY_FREQUENCY.default
  const triggers = PLAN_TRIGGERS[planType] || PLAN_TRIGGERS.Standard
  let monthlyExpected = 0
  for (const t of triggers) {
    monthlyExpected += (freq[t] || 0) * TRIGGER_PROBABILITY[t] * SEVERITY_FRACTION[t] * avgDailyEarnings
  }
  return monthlyExpected / 4.33  // weekly
}

/**
 * calculateContributionPremium
 * ─────────────────────────────
 * The worker-facing weekly premium: a fixed % of weekly earnings, rounded to ₹5.
 * This is what gets stored on the Policy and shown in the UI.
 *
 * @param {object} params
 * @param {string} params.planType          - 'Basic' | 'Standard' | 'Pro'
 * @param {number} params.avgDailyEarnings  - Worker's declared daily earnings (₹)
 * @returns {object}  { premium, weeklyEarnings, contributionRate, contributionPct, coverage }
 */
const calculateContributionPremium = ({ planType = 'Standard', avgDailyEarnings = 700 } = {}) => {
  const daily      = Math.min(parseFloat(avgDailyEarnings) || 700, 5000)
  const weekly     = daily * 7
  const rate       = CONTRIBUTION_RATE[planType] || CONTRIBUTION_RATE.Standard
  const multiplier = PLAN_COVERAGE_MULTIPLIER[planType] || PLAN_COVERAGE_MULTIPLIER.Standard

  const premium  = Math.round(weekly * rate / 5) * 5          // round to nearest ₹5
  const coverage = Math.round(weekly * multiplier / 50) * 50  // round to nearest ₹50

  return {
    premium,
    weeklyEarnings:  Math.round(weekly),
    contributionRate: rate,
    contributionPct: `${(rate * 100).toFixed(1)}%`,
    coverage,
    coverageMultiplier: `${multiplier}× weekly earnings`
  }
}

/**
 * calculateWeeklyPremium
 * ──────────────────────
 * Full premium object including both the worker-facing contribution price
 * and the internal actuarial reference. Used by policyController.
 *
 * @param {object} options
 * @param {string} options.city              - Worker's city
 * @param {string} options.planType          - 'Basic' | 'Standard' | 'Pro'
 * @param {number} options.avgDailyEarnings  - Worker's declared daily earnings (₹)
 * @returns {object}
 */
const calculateWeeklyPremium = ({ city = 'default', planType = 'Standard', avgDailyEarnings = 700 } = {}) => {
  const daily = Math.min(parseFloat(avgDailyEarnings) || 700, 5000)

  // ── Layer 2: worker-facing contribution price ──────────────────────────────
  const contribution = calculateContributionPremium({ planType, avgDailyEarnings: daily })

  // ── Layer 1: internal actuarial reference ─────────────────────────────────
  const actuarialPure  = _calcActuarialPure(city, planType, daily)
  const actuarialGross = Math.ceil(actuarialPure / (1 - TOTAL_LOADING) / 5) * 5

  // Expected monthly payout (for loss ratio simulation)
  const freq     = CITY_FREQUENCY[city] || CITY_FREQUENCY.default
  const triggers = PLAN_TRIGGERS[planType] || PLAN_TRIGGERS.Standard
  let expectedMonthlyPayout = 0
  for (const t of triggers) {
    const expectedDays  = (freq[t] || 0) * TRIGGER_PROBABILITY[t]
    const lossPerEvent  = Math.min(SEVERITY_FRACTION[t] * daily, PLAN_COVERAGE[planType])
    expectedMonthlyPayout += expectedDays * lossPerEvent
  }
  const expectedWeeklyPayout = expectedMonthlyPayout / 4.33

  // Loss ratio at the contribution price
  const weeklyPremiumIncome  = contribution.premium
  const impliedLossRatio     = weeklyPremiumIncome > 0
    ? Math.round((expectedWeeklyPayout / weeklyPremiumIncome) * 100)
    : 0

  const cityRisk = CITY_RISK_BAND[city] || 'medium'

  return {
    // ── Worker-facing ──────────────────────────────────────────────────────
    grossPremium:     contribution.premium,
    contributionPct:  contribution.contributionPct,
    weeklyEarnings:   contribution.weeklyEarnings,
    coverage:         contribution.coverage,
    coverageMultiplier: contribution.coverageMultiplier,

    // ── Actuarial reference (internal / admin) ─────────────────────────────
    actuarialPure:    Math.round(actuarialPure),
    actuarialGross:   actuarialGross,
    expectedWeeklyPayout: Math.round(expectedWeeklyPayout),
    impliedLossRatio: `${impliedLossRatio}%`,

    // ── Breakdown for UI display ───────────────────────────────────────────
    breakdown: {
      contributionRate:     contribution.contributionPct,
      weeklyEarnings:       contribution.weeklyEarnings,
      workerPremium:        contribution.premium,
      coverage:             contribution.coverage,
      coverageMultiplier:   contribution.coverageMultiplier,
      actuarialFairPremium: actuarialGross,
      affordabilityGap:     Math.max(0, actuarialGross - contribution.premium),
      expectedWeeklyPayout: Math.round(expectedWeeklyPayout),
      impliedLossRatio:     `${impliedLossRatio}%`,
      cityRisk
    },
    targetLossRatio: `${impliedLossRatio}%`,
    coverageCap:     contribution.coverage,
    planType,
    city,
    cityRisk
  }
}

/**
 * calculatePayout
 * ───────────────
 * Payout for a single triggered event, based on actual earnings profile.
 */
const calculatePayout = ({ avgDailyEarnings = 700, workHoursPerDay = 6, hoursLost = 6, coverageCap = 3500 }) => {
  const hourlyRate    = avgDailyEarnings / workHoursPerDay
  const rawPayout     = hourlyRate * hoursLost
  const cappedPayout  = Math.min(rawPayout, coverageCap)
  return Math.round(cappedPayout / 50) * 50
}

// Legacy compat
const calculatePremium = (basePremium, riskFactors) => {
  const cityMap  = { high: 'Chennai', medium: 'Mumbai', low: 'Bengaluru' }
  const city     = cityMap[riskFactors?.location] || 'default'
  const planType = riskFactors?.occupation === 'delivery' ? 'Standard' : 'Basic'
  return calculateWeeklyPremium({ city, planType }).grossPremium
}

module.exports = {
  calculatePremium,              // legacy compat
  calculateWeeklyPremium,        // full premium object
  calculateContributionPremium,  // worker-facing contribution only
  calculatePayout,               // per-event payout
  PLAN_COVERAGE,
  PLAN_TRIGGERS,
  PLAN_TRIGGERS,
  CITY_FREQUENCY,
  SEVERITY_FRACTION,
  TRIGGER_PROBABILITY,
  CONTRIBUTION_RATE,
  CITY_RISK_BAND
}