  import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import '../styles/dashboard.css'

const COMPLAINT_TYPES = [
  { value: 'claim_delay',     label: 'Claim not paid / delayed' },
  { value: 'wrong_amount',    label: 'Wrong payout amount' },
  { value: 'auto_claim',      label: 'Auto-claim not triggered' },
  { value: 'policy_issue',    label: 'Policy activation problem' },
  { value: 'account_issue',   label: 'Account / login issue' },
  { value: 'premium_issue',   label: 'Premium deducted incorrectly' },
  { value: 'app_bug',         label: 'App not working / bug' },
  { value: 'other',           label: 'Other' },
]

const STATUS_STEPS = [
  { label: 'Submitted',       desc: 'We received your complaint' },
  { label: 'Under Review',    desc: 'Our team is investigating' },
  { label: 'Action Taken',    desc: 'Resolution in progress' },
  { label: 'Resolved',        desc: 'Complaint closed' },
]

const ComplaintPage = () => {
  const [tab,       setTab]       = useState('submit')   // 'submit' | 'track'
  const [form,      setForm]      = useState({ type: '', subject: '', description: '', claimId: '', contactEmail: '', contactPhone: '' })
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [error,     setError]     = useState('')
  const [trackId,   setTrackId]   = useState('')
  const [tracked,   setTracked]   = useState(null)
  const [trackError,setTrackError]= useState('')

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.type || !form.subject || !form.description) {
      setError('Please fill in all required fields')
      return
    }
    if (form.description.length < 20) {
      setError('Please describe your issue in at least 20 characters')
      return
    }
    setLoading(true)
    // Simulate submission — in production this would POST to /api/complaints
    await new Promise(r => setTimeout(r, 1200))
    const ticketId = 'GW-' + Date.now().toString().slice(-6)
    setSubmitted({
      ticketId,
      type:        COMPLAINT_TYPES.find(c => c.value === form.type)?.label,
      subject:     form.subject,
      submittedAt: new Date().toLocaleString('en-IN'),
      eta:         '48 hours'
    })
    setLoading(false)
  }

  const handleTrack = (e) => {
    e.preventDefault()
    setTrackError('')
    if (!trackId.startsWith('GW-') || trackId.length < 9) {
      setTrackError('Please enter a valid ticket ID (e.g. GW-123456)')
      return
    }
    // Mock tracking data
    setTracked({
      ticketId:    trackId,
      subject:     'Complaint under review',
      status:      1,   // index into STATUS_STEPS
      submittedAt: '2 days ago',
      lastUpdate:  'Yesterday at 3:45 PM',
      message:     'Your complaint has been assigned to our claims resolution team. We will respond within 48 hours.'
    })
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <h2 className="page-title">Help & Complaints</h2>
        <p style={{ color: 'var(--color-text-secondary, #666)', marginBottom: '1.5rem', fontSize: 14 }}>
          We resolve all complaints within 48 hours. For IRDAI escalations, reference your ticket ID.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
          {[['submit', 'Submit a Complaint'], ['track', 'Track Complaint']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: '1px solid #d1d5db',
              background: tab === id ? '#667eea' : 'transparent',
              color:      tab === id ? '#fff'    : '#666',
              transition: 'all .15s'
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Submit tab ── */}
        {tab === 'submit' && (
          <>
            {!submitted ? (
              <div className="info-card">
                <h3 style={{ marginBottom: '1.25rem' }}>Raise a new complaint</h3>
                {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="info-grid">

                    <div className="form-group">
                      <label>Complaint Type *</label>
                      <select name="type" value={form.type} onChange={handleChange} required>
                        <option value="">Select type</option>
                        {COMPLAINT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Related Claim ID <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
                      <input type="text" name="claimId" value={form.claimId} onChange={handleChange}
                        placeholder="e.g. #142" />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Subject *</label>
                      <input type="text" name="subject" value={form.subject} onChange={handleChange}
                        placeholder="Brief summary of your issue" required />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Describe your issue * <span style={{ color: '#aaa', fontWeight: 400 }}>(min 20 characters)</span></label>
                      <textarea name="description" value={form.description} onChange={handleChange}
                        rows={10} required minLength={20}
                        placeholder="Please describe what happened, when it happened, and what you expected. The more detail you give, the faster we can resolve it."
                        style={{ width: "100%", resize: "vertical" }} />
                      <small style={{ color: '#aaa', fontSize: 11 }}>{form.description.length} characters</small>
                    </div>

                    <div className="form-group">
                      <label>Your Email <span style={{ color: '#aaa', fontWeight: 400 }}>(for updates)</span></label>
                      <input type="email" name="contactEmail" value={form.contactEmail || user.email || ''} onChange={handleChange}
                        placeholder={user.email || 'your@email.com'} />
                    </div>

                    <div className="form-group">
                      <label>Phone <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
                      <input type="tel" name="contactPhone" value={form.contactPhone} onChange={handleChange}
                        placeholder="+91 98765 43210" />
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', padding: '10px 14px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, fontSize: 12, color: '#854d0e', marginBottom: '1rem' }}>
                    ⚖️ For unresolved complaints, you may escalate to IRDAI at <strong>bap@irdai.gov.in</strong> or call <strong>155255</strong>. Reference your GW- ticket number.
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading} style={{ maxWidth: 240 }}>
                    {loading ? 'Submitting...' : 'Submit Complaint'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="info-card" style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <h3 style={{ marginBottom: 6 }}>Complaint Received</h3>
                <p style={{ color: '#666', fontSize: 14, marginBottom: '1.5rem' }}>
                  We'll get back to you within {submitted.eta}. Keep your ticket ID safe.
                </p>
                <div style={{ background: '#f8fafc', border: '2px dashed #667eea', borderRadius: 10, padding: '16px 24px', display: 'inline-block', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Your Ticket ID</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#667eea', letterSpacing: 2 }}>{submitted.ticketId}</div>
                </div>
                <div className="info-grid" style={{ marginBottom: '1.5rem' }}>
                  {[
                    ['Type',         submitted.type],
                    ['Subject',      submitted.subject],
                    ['Submitted at', submitted.submittedAt],
                    ['Expected reply','Within 48 hours'],
                  ].map(([l, v]) => (
                    <div key={l} className="info-item">
                      <span className="label">{l}</span>
                      <span className="value">{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="submit-btn" style={{ width: 'auto' }}
                    onClick={() => { setSubmitted(null); setForm({ type:'', subject:'', description:'', claimId:'', contactEmail:'', contactPhone:'' }) }}>
                    Submit Another
                  </button>
                  <button className="action-btn activate"
                    onClick={() => { setTab('track'); setTrackId(submitted.ticketId) }}>
                    Track This Complaint
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Track tab ── */}
        {tab === 'track' && (
          <div className="info-card">
            <h3 style={{ marginBottom: '1rem' }}>Track your complaint</h3>
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <input type="text" value={trackId} onChange={e => { setTrackId(e.target.value); setTrackError('') }}
                placeholder="Enter ticket ID — e.g. GW-123456"
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
              <button type="submit" className="submit-btn" style={{ width: 'auto', padding: '8px 20px' }}>
                Track
              </button>
            </form>
            {trackError && <div className="error-message" style={{ marginBottom: '1rem' }}>{trackError}</div>}

            {tracked && (
              <div>
                {/* Status stepper */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: 4 }}>
                  {STATUS_STEPS.map((step, i) => {
                    const done    = i < tracked.status
                    const current = i === tracked.status
                    return (
                      <div key={step.label} style={{ flex: 1, minWidth: 120, textAlign: 'center', position: 'relative' }}>
                        {i < STATUS_STEPS.length - 1 && (
                          <div style={{
                            position: 'absolute', top: 14, left: '50%', width: '100%', height: 3,
                            background: done ? '#667eea' : '#e2e8f0', zIndex: 0
                          }} />
                        )}
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', margin: '0 auto 8px', position: 'relative', zIndex: 1,
                          background: done ? '#667eea' : current ? '#fff' : '#e2e8f0',
                          border: current ? '3px solid #667eea' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700,
                          color: done ? '#fff' : current ? '#667eea' : '#aaa'
                        }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: current ? 600 : 400, color: current ? '#667eea' : done ? '#333' : '#aaa' }}>{step.label}</div>
                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{step.desc}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Ticket details */}
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#888' }}>Ticket ID</span>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#667eea' }}>{tracked.ticketId}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 11, color: '#888' }}>Current status</span>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>{STATUS_STEPS[tracked.status].label}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.55, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                    {tracked.message}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
                    Submitted {tracked.submittedAt} · Last update: {tracked.lastUpdate}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#888', padding: '10px 14px', background: '#fefce8', borderRadius: 8, border: '1px solid #fde047' }}>
                  Not satisfied with the resolution? Escalate to IRDAI at <strong>bap@irdai.gov.in</strong> with ticket ID <strong>{tracked.ticketId}</strong>.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact info */}
        <div className="info-card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Other ways to reach us</h3>
          <div className="info-grid">
            {[
              { icon: '📧', label: 'Email',        value: 'support@gigshield.in',  note: 'Reply within 24 hrs' },
              { icon: '📞', label: 'Helpline',     value: '1800-XXX-XXXX',         note: 'Mon–Sat, 9am–6pm' },
              { icon: '⚖️', label: 'IRDAI Grievance', value: 'bap@irdai.gov.in',  note: 'For unresolved complaints' },
              { icon: '📍', label: 'Ombudsman',    value: 'irdai.gov.in/ombudsman',note: 'Insurance disputes' },
            ].map(c => (
              <div key={c.label} className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span className="label">{c.icon} {c.label}</span>
                <span className="value" style={{ fontWeight: 600 }}>{c.value}</span>
                <span style={{ fontSize: 11, color: '#aaa' }}>{c.note}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default ComplaintPage