import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/dashboard.css'

const STATS = [
  { value: '8 cities', label: 'Covered across India' },
  { value: '< 4 hrs',  label: 'UPI payout time' },
  { value: '2–5%',     label: 'Of weekly earnings' },
  { value: '0',        label: 'Claim forms needed' },
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
        <div className="hero-content">
          <div style={{ fontSize: 12, letterSpacing: '0.12em', color: 'rgba(167,139,250,0.9)', textTransform: 'uppercase', marginBottom: 20, fontWeight: 600 }}>
            IRDAI Regulatory Sandbox · Parametric Income Protection
          </div>

          <h1 style={{
            fontSize: 'clamp(4.5rem, 13vw, 9rem)',
            fontWeight: 900,
            letterSpacing: '-4px',
            lineHeight: 0.92,
            margin: '0 0 16px',
            color: '#fff',
            textShadow: '0 4px 40px rgba(0,0,0,0.25)',
          }}>
            Gig_Worker
          </h1>

          <p style={{ fontSize: 14, color: 'rgba(167,139,250,0.8)', fontWeight: 600, marginBottom: 24, letterSpacing: '0.04em' }}>
            POWERED BY GIGSHIELD AI
          </p>

          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'rgba(255,255,255,0.85)', maxWidth: 500, margin: '0 auto 8px', lineHeight: 1.6, fontWeight: 300 }}>
            Rain or bad air cost you earnings today?<br />
            <strong style={{ fontWeight: 600, color: '#fff' }}>We pay you automatically — straight to UPI.</strong>
          </p>

          <p style={{ fontSize: 12, color: 'rgba(255,180,180,0.8)', marginBottom: 32 }}>
            ⚠️ Income protection only — health, vehicle, and accidents are not covered.
          </p>

          <div className="hero-buttons" style={{ marginBottom: 56 }}>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }}>
              Get Covered — From 2% of Earnings
            </Link>
            <Link to="/login" className="btn btn-secondary" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
              Login
            </Link>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, maxWidth: 640, margin: '0 auto', background: 'rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' }}>
            {STATS.map(s => (
              <div key={s.label} style={{ padding: '16px 8px', textAlign: 'center', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 700, color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '5rem 2rem', background: '#fff' }}>
        <h2 className="section-title">How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32, maxWidth: 860, margin: '2.5rem auto 0' }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#667eea', background: '#eef2ff', borderRadius: 8, padding: '6px 10px', flexShrink: 0, letterSpacing: '0.05em' }}>{s.n}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLANS ── */}
      <section style={{ padding: '5rem 2rem', background: '#f8fafc' }}>
        <h2 className="section-title">Weekly plans</h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '2.5rem', fontSize: 14 }}>
          Zomato and Swiggy pay weekly. So does Gig_Worker. Cancel anytime.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: '#fff', borderRadius: 16, padding: '28px 24px',
              border: plan.recommended ? `2px solid ${plan.color}` : '1px solid #e2e8f0',
              position: 'relative', boxShadow: plan.recommended ? '0 8px 32px rgba(102,102,234,0.15)' : '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              {plan.recommended && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: plan.color, lineHeight: 1 }}>{plan.rate}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>of weekly earnings</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
                Up to {plan.cap}/week
              </div>
              {plan.triggers.map(t => (
                <div key={t} style={{ fontSize: 12.5, color: '#475569', marginBottom: 5, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0 }}>✓</span> {t}
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>Best for: {plan.for}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '5rem 2rem', background: '#fff' }}>
        <h2 className="section-title">Built for delivery partners</h2>
        <div className="features-grid" style={{ maxWidth: 900, margin: '2.5rem auto 0' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#f8fafc', borderRadius: 12, padding: '20px 20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── NOT COVERED ── */}
      <section style={{ padding: '4rem 2rem', background: '#fff5f5' }}>
        <h2 className="section-title" style={{ color: '#dc2626' }}>What we do NOT cover</h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginBottom: '2rem' }}>
          Gig_Worker is income protection only.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, maxWidth: 780, margin: '0 auto' }}>
          {[
            { icon: '🏥', label: 'Health & medical' },
            { icon: '🛵', label: 'Vehicle repairs' },
            { icon: '🚑', label: 'Accidents & injury' },
            { icon: '💀', label: 'Life insurance' },
          ].map(e => (
            <div key={e.label} style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{e.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{e.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '5rem 2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 800, color: '#fff', marginBottom: 12 }}>
          Ready to protect your earnings?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, marginBottom: 32 }}>
          Join thousands of delivery partners already covered.
        </p>
        <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '1rem 3rem', display: 'inline-block' }}>
          Get Covered — From 2% of Earnings
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <p>
          © 2026 Gig_Worker · Powered by GigShield AI · IRDAI Sandbox Ref: IRDAI/SB/2024/0091 ·
          <a href="/register" style={{ color: '#a78bfa', marginLeft: 8 }}>Get covered →</a>
        </p>
      </footer>

    </div>
  )
}

export default Home