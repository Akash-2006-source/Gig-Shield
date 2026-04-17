import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/dashboard.css'

const features = [
  { title: 'Parametric Rain Trigger', desc: 'IMD rainfall >=50mm/3hr fires your claim automatically. No photos, no proof, no hassle.' },
  { title: 'Direct payment to the delivery partner', desc: 'Income-loss payout goes directly to the delivery partner account or UPI ID. No third-party involvement.' },
  { title: 'Weekly Pricing', desc: 'Premium deducted from your weekly Zomato or Swiggy payout. No upfront costs.' },
  { title: 'AI Risk Assessment', desc: '5-year IMD + CPCB data, city-specific disruption frequency, and your earnings profile.' },
  { title: 'Tracking the location of the delivery partner', desc: 'Consented GPS verification matches the exact delivery zone with local weather and AQI data.' },
  { title: 'Fraud Detection', desc: 'Multi-signal trust scoring checks GPS, device, and claim pattern to protect honest workers.' }
]

const Home = () => {
  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-content">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
            fontSize: 12, letterSpacing: '0.08em', color: '#fff',
            textTransform: 'uppercase', marginBottom: 20, fontWeight: 600,
            backdropFilter: 'blur(6px)'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
            Parametric income protection · Live in India
          </div>

          <h1 className="hero-title">
            Rain stopped your ride?
            <br />
            <span style={{ background: 'linear-gradient(90deg, #fde68a 0%, #fca5a5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              We pay you automatically.
            </span>
          </h1>

          <p className="hero-subtitle" style={{ maxWidth: 620, margin: '1rem auto', lineHeight: 1.5 }}>
            GigShield watches weather + AQI in your zone. When it crosses the line, your UPI gets credited — no claim form, no proof, no waiting.
          </p>

          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 10, margin: '1.5rem auto', maxWidth: 680
          }}>
            {[
              { k: '⚡', t: 'Payout in 24h' },
              { k: '📍', t: 'Zone-verified GPS' },
              { k: '💸', t: 'Direct to your UPI' },
              { k: '🤖', t: 'No paperwork' }
            ].map(chip => (
              <span key={chip.t} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 999, padding: '6px 14px', fontSize: 13, color: '#fff', fontWeight: 500
              }}>
                <span>{chip.k}</span>{chip.t}
              </span>
            ))}
          </div>

          <div className="hero-buttons">
            <Link to="/register" className="btn btn-primary">Get Insured in 2 min →</Link>
            <Link to="/login" className="btn btn-secondary">I already have an account</Link>
          </div>

          <div style={{ marginTop: 28, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
            Built for Zomato · Swiggy · Zepto · Blinkit · Amazon · Flipkart partners
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-grid">
          {[
            { n: '1', title: 'The person', desc: 'A named delivery partner with city, earnings profile, and payout route.' },
            { n: '2', title: 'The disruption', desc: 'A specific and objective event such as heavy rain, severe AQI, or heat alert.' },
            { n: '3', title: 'The relief', desc: 'Trigger verified, location matched, and direct payment sent to the delivery partner.' }
          ].map((step) => (
            <div key={step.n} className="step-card">
              <div className="step-number">{step.n}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Built for Insurance Market Reality</h2>
        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.title} className="feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home
