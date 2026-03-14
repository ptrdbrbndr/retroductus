'use client'

import { useState } from 'react'
import { GitBranch, ArrowRight } from 'lucide-react'

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
    <div className="min-h-screen flex flex-col bg-white">

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" style={{ color: 'var(--retro-teal)' }} />
            <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--retro-navy)', fontFamily: 'Cormorant Garamond, serif' }}>
              Retroductus
            </span>
          </div>
          <a href="https://www.conductus.nl" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            conductus.nl ↗
          </a>
        </div>
      </header>

      {/* Hero — zelfde stijl als de landingspagina */}
      <section className="relative flex-1 flex items-center justify-center overflow-hidden pt-16" style={{ background: 'var(--retro-navy)' }}>
        <div className="hero-glow" style={{ width: 600, height: 600, background: '#2EC4B6', opacity: 0.07, top: -150, right: -150 }} />
        <div className="hero-glow" style={{ width: 500, height: 500, background: '#1B6B93', opacity: 0.1, bottom: -100, left: -100 }} />

        <div className="relative max-w-2xl mx-auto px-6 py-32 text-center">

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-10 border"
            style={{ borderColor: 'rgba(46,196,182,0.3)', color: '#2EC4B6', background: 'rgba(46,196,182,0.08)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            In ontwikkeling — binnenkort beschikbaar
          </div>

          {/* Heading */}
          <h1 className="font-bold text-white leading-[1.05] mb-6"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(3rem, 8vw, 5.5rem)', letterSpacing: '-0.01em' }}>
            Kijk terug.<br />
            <span className="gradient-text">Stuur bij.</span><br />
            Leid beter.
          </h1>

          {/* Description */}
          <p className="text-lg text-white/60 max-w-lg mx-auto mb-12 font-light leading-relaxed">
            Retroductus is een <strong className="text-white/90 font-medium">process mining platform</strong> dat laat zien hoe jouw processen écht verlopen. Upload een event log — ontdek bottlenecks, afwijkingen en AI-gedreven verbetermogelijkheden.
          </p>

          {/* Waitlist form */}
          {state === 'success' ? (
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl"
              style={{ background: 'rgba(46,196,182,0.15)', border: '1px solid rgba(46,196,182,0.3)' }}>
              <div className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 9l4 4 8-8" strokeLinecap="round"/></svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#2EC4B6' }}>
                Je staat op de lijst. We houden je op de hoogte.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" noValidate>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jouw@email.nl"
                data-testid="email-input"
                required
                disabled={state === 'loading'}
                className="flex-1 text-sm px-4 py-3 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                data-testid="waitlist-submit"
                disabled={state === 'loading'}
                className="inline-flex items-center justify-center gap-2 text-white text-sm font-medium px-6 py-3 rounded-lg gradient-bg hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50"
              >
                {state === 'loading' ? 'Bezig...' : (<>Zet me op de lijst <ArrowRight className="h-4 w-4" /></>)}
              </button>
            </form>
          )}

          {errorMsg && (
            <p role="alert" className="text-sm mt-3" style={{ color: '#F87171' }}>{errorMsg}</p>
          )}

          <p className="text-xs mt-5" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Geen spam. Alleen nieuws over de lancering.
          </p>

          {/* Feature preview tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-16">
            {[
              { n: '01', label: 'Process Discovery' },
              { n: '02', label: 'Conformance Checking' },
              { n: '03', label: 'Performance Analytics' },
              { n: '04', label: 'AI Insights', accent: true },
            ].map(({ n, label, accent }) => (
              <div key={n} className="rounded-xl p-4 text-left"
                style={{
                  background: accent ? 'rgba(46,196,182,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${accent ? 'rgba(46,196,182,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <div className="text-xs font-medium mb-2" style={{ color: accent ? '#2EC4B6' : 'rgba(255,255,255,0.25)' }}>{n}</div>
                <p className="text-sm font-semibold text-white/80" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6" style={{ borderColor: 'rgba(11,29,58,0.08)' }}>
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>© 2026 Retroductus — Pieter de Brabander</span>
          <span>Onderdeel van de <a href="https://www.conductus.nl" className="hover:text-gray-600 transition-colors" style={{ color: 'var(--retro-blue)' }}>Conductus-suite</a></span>
        </div>
      </footer>

    </div>
  )
}
