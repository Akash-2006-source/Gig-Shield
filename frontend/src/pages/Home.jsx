import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/dashboard.css'

const STATS = [
  { value: '8 cities', label: 'Covered across India', icon: '🏙️' },
  { value: '< 4 hrs',  label: 'UPI payout time', icon: '⚡' },
  { value: '2–5%',     label: 'Of weekly earnings', icon: '💰' },
  { value: '0',        label: 'Claim forms needed', icon: '📋' },
]

const PLANS = [
  {
    name: 'Shield Basic', rate: '2%', cap: '₹2,500',
    color: '#64748b',
    triggers: ['Heavy rain (≥50mm/3hr)', 'Severe AQI (≥200)'],
    for: 'Dry season · low-risk zones'
  },
  {
    name: 'Shield Standard', rate: '3.5%', cap: '₹3,500',
    color: '#667eea', recommended: true,
    triggers: ['Heavy rain', 'Severe AQI', 'Extreme heat (≥42°C)', 'Cyclone / Red Alert'],
    for: 'Monsoon · Chennai, Mumbai, Kolkata'
  },
  {
    name: 'Shield Pro', rate: '5%', cap: '₹5,000',
    color: '#7c3aed',
    triggers: ['Heavy rain', 'Severe AQI', 'Extreme heat', 'Cyclone', 'Curfew / hartal / strike'],
    for: 'All-year · high-density cities'
  },
]

const STEPS = [
  { n: '01', title: 'Register in 2 minutes', desc: 'Enter your platform, city, and average daily earnings.' },
  { n: '02', title: 'Your contribution is set', desc: 'A fixed % of weekly earnings — scales with your income automatically.' },
  { n: '03', title: 'Disruption → auto payout', desc: 'IMD confirms rain ≥50mm or AQI ≥200? Money hits your UPI. No action needed.' },
]

const FEATURES = [
  { icon: '🌧️', title: 'Parametric triggers',    desc: 'Live IMD + CPCB data. No manual claims for weather events.' },
  { icon: '💸', title: 'UPI in under 4 hours',   desc: '₹600–₹1,200 per disruption day, direct to your account.' },
  { icon: '📊', title: 'Scales with earnings',   desc: 'Pay 2–5% of what you earn. Earn more, covered more.' },
  { icon: '🤖', title: 'AI fraud protection',    desc: 'Protects honest workers. Bad actors get flagged automatically.' },
  { icon: '📅', title: 'Weekly cycle',           desc: 'Aligned to Zomato/Swiggy payouts. Cancel anytime.' },
  { icon: '📋', title: 'IRDAI sandbox',          desc: 'Ref: IRDAI/SB/2024/0091. Your premiums are protected.' },
]

const Home = () => {
  return (
    <div className="landing-page">

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }} />
          ))}
        </div>
        <div className="hero-content">
          <div className="hero-badge animate-fade-in">
            IRDAI Regulatory Sandbox · Parametric Income Protection
          </div>

          <h1 className="hero-title-modern animate-slide-up">
            Gig_Worker
          </h1>

          <p className="hero-powered animate-slide-up-delay-1">
            POWERED BY GIGSHIELD AI
          </p>

          <p className="hero-description animate-slide-up-delay-2">
            Rain or bad air cost you earnings today?<br />
            <strong>We pay you automatically — straight to UPI.</strong>
          </p>

          <p className="hero-disclaimer animate-slide-up-delay-3">
            ⚠️ Income protection only — health, vehicle, and accidents are not covered.
          </p>

          <div className="hero-buttons animate-slide-up-delay-4">
            <Link to="/register" className="btn btn-primary btn-lg">
              Get Covered — From 2% of Earnings
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Login
            </Link>
          </div>

          {/* Stats row */}
          <div className="stats-row animate-fade-in-delay">
            {STATS.map(s => (
              <div key={s.label} className="stat-item">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-it-works">
        <h2 className="section-title">How it works</h2>
        <div className="steps-grid-modern">
          {STEPS.map(s => (
            <div key={s.n} className="step-card-modern">
              <div className="step-number-modern">{s.n}</div>
              <div className="step-content">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLANS ── */}
      <section className="plans-section">
        <h2 className="section-title">Weekly plans</h2>
        <p className="section-subtitle">
          Zomato and Swiggy pay weekly. So does Gig_Worker. Cancel anytime.
        </p>
        <div className="plans-grid">
          {PLANS.map(plan => (
            <div key={plan.name} className={`plan-card ${plan.recommended ? 'recommended' : ''}`}>
              {plan.recommended && (
                <div className="recommended-badge">MOST POPULAR</div>
              )}
              <div className="plan-header">
                <div className="plan-name">{plan.name}</div>
                <div className="plan-rate" style={{ color: plan.color }}>{plan.rate}</div>
                <div className="plan-rate-label">of weekly earnings</div>
                <div className="plan-cap">Up to {plan.cap}/week</div>
              </div>
              <div className="plan-features">
                {plan.triggers.map(t => (
                  <div key={t} className="plan-feature">
                    <span className="check-icon" style={{ color: plan.color }}>✓</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <div className="plan-footer">
                Best for: {plan.for}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section">
        <h2 className="section-title">Built for delivery partners</h2>
        <div className="features-grid-modern">
          {FEATURES.map((f, idx) => (
            <div key={f.title} className="feature-card-modern" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── NOT COVERED ── */}
      <section className="not-covered-section">
        <h2 className="section-title-red">What we do NOT cover</h2>
        <p className="section-subtitle">
          Gig_Worker is income protection only.
        </p>
        <div className="not-covered-grid">
          {[
            { icon: '🏥', label: 'Health & medical' },
            { icon: '🛵', label: 'Vehicle repairs' },
            { icon: '🚑', label: 'Accidents & injury' },
            { icon: '💀', label: 'Life insurance' },
          ].map(e => (
            <div key={e.label} className="not-covered-item">
              <div className="not-covered-icon">{e.icon}</div>
              <div className="not-covered-label">{e.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to protect your earnings?</h2>
        <p className="cta-subtitle">
          Join thousands of delivery partners already covered.
        </p>
        <Link to="/register" className="btn btn-primary btn-xl">
          Get Covered — From 2% of Earnings
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <p>
          © 2026 Gig_Worker · Powered by GigShield AI · IRDAI Sandbox Ref: IRDAI/SB/2024/0091 ·
          <Link to="/register" className="footer-link">Get covered →</Link>
        </p>
      </footer>

    </div>
  )
}

export default Home
