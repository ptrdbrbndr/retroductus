'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/app'
    }
  }

  return (
    <div
      className="rounded-xl p-8"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      data-testid="login-form"
    >
      <h1 className="text-white text-2xl font-semibold mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        Inloggen
      </h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>E-mailadres</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            data-testid="login-email"
            className="w-full px-4 py-3 rounded-lg text-white outline-none"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Wachtwoord</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            data-testid="login-password"
            className="w-full px-4 py-3 rounded-lg text-white outline-none"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          data-testid="login-submit"
          className="w-full py-3 rounded-lg font-medium text-white gradient-bg"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Bezig...' : 'Inloggen'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Nog geen account?{' '}
        <a href="/register" className="underline" style={{ color: 'var(--retro-teal)' }}>
          Registreren
        </a>
      </p>
    </div>
  )
}
