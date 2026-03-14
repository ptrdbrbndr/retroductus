'use client'

import { useState } from 'react'

export default function ComingSoon() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Voer een geldig e-mailadres in.')
      return
    }
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setState('success')
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.message || 'Er ging iets mis. Probeer het opnieuw.')
        setState('error')
      }
    } catch {
      setErrorMsg('Er ging iets mis. Probeer het opnieuw.')
      setState('error')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: '#FAFAF8',
        backgroundImage: `
          linear-gradient(rgba(11,29,58,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(11,29,58,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }}
    >
      {/* Top bar */}
      <div style={{ background: '#0B1D3A', borderBottom: '2px solid #2EC4B6', padding: '10px 24px' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ width: 22, height: 22, background: '#2EC4B6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0B1D3A" strokeWidth="3" aria-hidden="true">
                <circle cx="12" cy="12" r="9" strokeWidth="2.5"/>
                <path d="M12 7v5l3 2" strokeLinecap="square" stroke="#F59E0B"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.08em' }}>RETRODUCTUS</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#2EC4B6', opacity: 0.7, letterSpacing: '0.1em' }}>by Conductus</span>
          </div>
          <a href="https://www.conductus.nl" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(46,196,182,0.6)', fontWeight: 500 }}>
            conductus.nl ↗
          </a>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl w-full text-center">

          {/* Status badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: '2px solid #2EC4B6', padding: '6px 16px',
            fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1B6B93',
            background: 'rgba(46,196,182,0.06)', marginBottom: 40,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2EC4B6', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            In ontwikkeling — binnenkort beschikbaar
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(3.2rem, 10vw, 6.5rem)',
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            color: '#0B1D3A',
            marginBottom: 28,
          }}>
            Kijk terug.<br />
            <em style={{
              fontStyle: 'normal',
              background: 'linear-gradient(135deg, #2EC4B6, #1B6B93)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Stuur bij.</em><br />
            Leid beter.
          </h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 18, lineHeight: 1.7,
            color: 'rgba(11,29,58,0.55)', maxWidth: 520, margin: '0 auto 48px',
          }}>
            Retroductus is een <strong style={{ color: '#0B1D3A', fontWeight: 600 }}>process mining platform</strong> dat laat zien hoe jouw processen écht verlopen — upload een event log en ontdek bottlenecks, afwijkingen en AI-gedreven verbetermogelijkheden.
          </p>

          {/* Waitlist form */}
          {state === 'success' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 24, height: 24, background: '#2EC4B6', border: '2px solid #0B1D3A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#0B1D3A" strokeWidth="2.5" aria-hidden="true"><path d="M2 9l4 4 8-8" strokeLinecap="square"/></svg>
              </div>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: '#0B1D3A', fontWeight: 700 }}>
                Je staat op de lijst. We houden je op de hoogte.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'row', gap: 10, maxWidth: 460, margin: '0 auto 12px', flexWrap: 'wrap', justifyContent: 'center' }} noValidate>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jouw@email.nl"
                data-testid="email-input"
                required
                disabled={state === 'loading'}
                style={{
                  flex: '1 1 200px',
                  border: '2px solid #0B1D3A',
                  background: 'white',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  padding: '13px 16px',
                  color: '#0B1D3A',
                  outline: 'none',
                  minWidth: 0,
                }}
              />
              <button
                type="submit"
                data-testid="waitlist-submit"
                disabled={state === 'loading'}
                style={{
                  background: '#F59E0B',
                  border: '2px solid #0B1D3A',
                  boxShadow: state === 'loading' ? 'none' : '3px 3px 0 #0B1D3A',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0B1D3A',
                  padding: '13px 24px',
                  cursor: state === 'loading' ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: state === 'loading' ? 0.6 : 1,
                }}
              >
                {state === 'loading' ? 'Bezig...' : 'Zet me op de lijst →'}
              </button>
            </form>
          )}

          {errorMsg && (
            <p role="alert" style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#DC2626', marginBottom: 8 }}>
              {errorMsg}
            </p>
          )}

          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(11,29,58,0.35)', letterSpacing: '0.06em', marginTop: 16 }}>
            Geen spam. Alleen nieuws over de lancering.
          </p>

          {/* Feature tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 56 }}>
            {[
              { n: '01', label: 'Process\nDiscovery' },
              { n: '02', label: 'Conformance\nChecking' },
              { n: '03', label: 'Performance\nAnalytics' },
              { n: '04', label: 'AI\nInsights', accent: true },
            ].map(({ n, label, accent }) => (
              <div key={n} style={{
                border: `2px solid ${accent ? '#2EC4B6' : '#0B1D3A'}`,
                background: accent ? '#F59E0B' : 'white',
                padding: '14px 12px',
                boxShadow: `3px 3px 0 ${accent ? '#2EC4B6' : '#0B1D3A'}`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', opacity: accent ? 0.5 : 0.3, marginBottom: 6, textTransform: 'uppercase' }}>{n}</div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontWeight: 600, lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '2px solid #0B1D3A', background: 'white', padding: '20px 24px' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(11,29,58,0.3)', letterSpacing: '0.08em' }}>
            © 2026 RETRODUCTUS — PIETER DE BRABANDER
          </p>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(11,29,58,0.3)' }}>
            Onderdeel van de{' '}
            <a href="https://www.conductus.nl" style={{ color: '#1B6B93', textDecoration: 'underline' }}>Conductus-suite</a>
          </p>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
