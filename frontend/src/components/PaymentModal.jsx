import React, { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * PaymentModal
 * ─────────────
 * Opens Razorpay checkout after creating an order on the backend.
 * In demo mode (no Razorpay keys), shows a mock payment screen instead.
 *
 * Props:
 *   policy   — the policy object { id, type, premium, coverage }
 *   onSuccess(result) — called after successful payment + verification
 *   onClose()         — called when modal is dismissed
 */
const PaymentModal = ({ policy, onSuccess, onClose }) => {
  const [step,    setStep]    = useState('confirm')   // confirm | processing | demo | success | error
  const [order,   setOrder]   = useState(null)
  const [message, setMessage] = useState('')
  const [demoPin, setDemoPin] = useState('')

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()

  const createOrder = async () => {
    try {
      setStep('processing')
      const data = await api.post('/payments/create-order', { policyId: policy.id }).then(r => r.data)
      setOrder(data)

      if (data.demo) {
        setStep('demo')
        return
      }

      // Load Razorpay script dynamically
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script  = document.createElement('script')
          script.src    = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload = resolve
          script.onerror = reject
          document.body.appendChild(script)
        })
      }

      const options = {
        key:         data.keyId,
        amount:      data.amount,
        currency:    'INR',
        name:        'Gig_Worker',
        description: data.description,
        order_id:    data.id,
        prefill: {
          name:    user.name  || '',
          email:   user.email || '',
          contact: ''
        },
        theme: { color: '#667eea' },
        modal: { ondismiss: () => { setStep('confirm'); setOrder(null) } },
        handler: async (response) => {
          await verifyPayment(response, data)
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
      setStep('confirm')  // reset while checkout is open
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to initiate payment')
      setStep('error')
    }
  }

  const verifyPayment = async (response, orderData) => {
    try {
      setStep('processing')
      const result = await api.post('/payments/verify', {
        razorpay_order_id:   response.razorpay_order_id   || orderData?.id,
        razorpay_payment_id: response.razorpay_payment_id || 'demo',
        razorpay_signature:  response.razorpay_signature  || '',
        policyId:            policy.id
      }).then(r => r.data)
      setStep('success')
      setTimeout(() => onSuccess(result), 1500)
    } catch (err) {
      setMessage(err.response?.data?.message || 'Payment verification failed')
      setStep('error')
    }
  }

  const handleDemoPayment = async () => {
    if (demoPin !== '1234') { setMessage('Wrong demo PIN. Use 1234.'); return }
    setMessage('')
    await verifyPayment({}, order)
  }

  const planColor = { Basic: '#64748b', Standard: '#667eea', Pro: '#7c3aed' }[policy.type] || '#667eea'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--color-background-primary, #fff)',
        borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>

        {/* ── Confirm step ── */}
        {step === 'confirm' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>🛡️</div>
              <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>Activate {policy.type} Plan</h3>
              <p style={{ color: '#666', fontSize: 13, margin: 0 }}>Weekly income protection via Razorpay</p>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: '1.25rem' }}>
              {[
                ['Plan',          `Shield ${policy.type}`],
                ['Weekly premium',`₹${Number(policy.premium).toFixed(0)}`],
                ['Coverage cap',  `₹${Number(policy.coverage).toLocaleString('en-IN')}/week`],
                ['Payment method','UPI · Cards · Wallets'],
                ['Auto-renews',   'Every 7 days (cancel anytime)'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#888' }}>{l}</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginBottom: '1.25rem' }}>
              🔒 Secured by Razorpay · PCI-DSS compliant · Your card details are never stored
            </div>

            <button onClick={createOrder} style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: planColor, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer'
            }}>
              Pay ₹{Number(policy.premium).toFixed(0)} via Razorpay
            </button>
            <button onClick={onClose} style={{
              width: '100%', marginTop: 10, padding: '10px', borderRadius: 10,
              border: '1px solid #e2e8f0', background: 'transparent', fontSize: 13,
              color: '#666', cursor: 'pointer'
            }}>
              Cancel
            </button>
          </>
        )}

        {/* ── Processing ── */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⏳</div>
            <p style={{ fontWeight: 600, fontSize: 16 }}>Processing payment...</p>
            <p style={{ color: '#888', fontSize: 13 }}>Please wait, do not close this window.</p>
          </div>
        )}

        {/* ── Demo mode ── */}
        {step === 'demo' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>🧪</div>
              <h3 style={{ margin: '0 0 4px' }}>Demo Payment Mode</h3>
              <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
                Razorpay keys not configured. Use demo PIN to simulate payment.
              </p>
            </div>

            <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem', fontSize: 12, color: '#854d0e' }}>
              💡 To use real Razorpay, add <strong>RAZORPAY_KEY_ID</strong> and <strong>RAZORPAY_KEY_SECRET</strong> to your <code>.env</code> file.
              Get free test keys at <strong>dashboard.razorpay.com</strong>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem', fontSize: 13, color: '#166534', textAlign: 'center' }}>
              Demo PIN: <strong style={{ fontSize: 18, letterSpacing: 4 }}>1234</strong>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>Enter Demo PIN</label>
              <input type="password" value={demoPin} onChange={e => { setDemoPin(e.target.value); setMessage('') }}
                placeholder="Enter 1234"
                maxLength={4}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 16, textAlign: 'center', letterSpacing: 6, boxSizing: 'border-box' }} />
              {message && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{message}</p>}
            </div>

            <button onClick={handleDemoPayment} style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: planColor, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer'
            }}>
              Confirm Demo Payment — ₹{Number(policy.premium).toFixed(0)}
            </button>
            <button onClick={onClose} style={{
              width: '100%', marginTop: 10, padding: '10px', borderRadius: 10,
              border: '1px solid #e2e8f0', background: 'transparent', fontSize: 13,
              color: '#666', cursor: 'pointer'
            }}>
              Cancel
            </button>
          </>
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <h3 style={{ margin: '0 0 8px', color: '#16a34a' }}>Payment Successful!</h3>
            <p style={{ color: '#666', fontSize: 13 }}>
              Your {policy.type} plan is now active. Parametric claim monitoring has started.
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>❌</div>
            <h3 style={{ margin: '0 0 8px', color: '#dc2626' }}>Payment Failed</h3>
            <p style={{ color: '#666', fontSize: 13, marginBottom: '1.25rem' }}>{message}</p>
            <button onClick={() => setStep('confirm')} style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: planColor, color: '#fff', fontSize: 14, cursor: 'pointer'
            }}>
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default PaymentModal