import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/dashboard.css'

const plans = [
  {
    name: 'Shield Basic',
    price: '99/week',
    cap: '2500 coverage cap',
    triggers: ['Heavy rain (>=50mm)', 'Severe AQI (>=200)'],
    note: 'Dry season / low-risk zones'
  },
  {
    name: 'Shield Standard',
    price: '149/week',
    cap: '3500 coverage cap',
    triggers: ['Heavy rain (>=50mm)', 'Severe AQI (>=200)', 'Extreme heat (>=42C)', 'Cyclone / Red Alert'],
    note: 'Monsoon season for Chennai and Mumbai',
    recommended: true
  },
  {
    name: 'Shield Pro',
    price: '229/week',
    cap: '5000 coverage cap',
    triggers: ['Heavy rain (>=50mm)', 'Severe AQI (>=200)', 'Extreme heat (>=42C)', 'Cyclone / Red Alert', 'Section 144 curfew / hartal'],
    note: 'All-year cover for high-density cities'
  }
]

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
          <div style={{ fontSize: 13, letterSpacing: '0.08em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
            Insurance product for gig workers
          </div>
          <h1 className="hero-title">
            Income lost to rain or AQI?
            <br />
            You get paid automatically.
          </h1>
          <p className="hero-subtitle" style={{ maxWidth: 620, margin: '1rem auto' }}>
            GigShield is a parametric income-protection platform built for delivery partners.
            When extreme weather or pollution disrupts work, GigShield triggers relief using objective data,
            sends direct payment to the delivery partner, and uses location tracking to verify the right trigger zone.
          </p>
          <div className="hero-buttons">
            <Link to="/register" className="btn btn-primary">Get Insured</Link>
            <Link to="/login" className="btn btn-secondary">Login</Link>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Weekly Plans</h2>
        <div className="steps-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {plans.map((plan) => (
            <div key={plan.name} className="step-card" style={{ position: 'relative', border: plan.recommended ? '2px solid #667eea' : undefined }}>
              {plan.recommended && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#667eea', color: '#fff', fontSize: 11, padding: '2px 12px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  AI RECOMMENDED
                </div>
              )}
              <h3 style={{ marginTop: plan.recommended ? 8 : 0 }}>{plan.name}</h3>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#667eea', margin: '4px 0' }}>{plan.price}</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{plan.cap}</div>
              {plan.triggers.map((trigger) => <p key={trigger} style={{ fontSize: 13, color: '#444', margin: '3px 0' }}>{trigger}</p>)}
              <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>Best for: {plan.note}</p>
            </div>
          ))}
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
