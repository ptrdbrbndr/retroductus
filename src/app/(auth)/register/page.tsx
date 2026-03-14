'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        data-testid="register-done"
      >
        <div className="text-4xl mb-4">✉️</div>
        <h1 className="text-white text-xl font-semibold mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Controleer je e-mail
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>
          We hebben een bevestigingslink gestuurd naar <strong className="text-white">{email}</strong>.
          Klik op de link om je account te activeren.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-8"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      data-testid="register-form"
    >
      <h1 className="text-white text-2xl font-semibold mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        Account aanmaken
      </h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>E-mailadres</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            data-testid="register-email"
            className="w-full px-4 py-3 rounded-lg text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Wachtwoord</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            data-testid="register-password"
            className="w-full px-4 py-3 rounded-lg text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          data-testid="register-submit"
          className="w-full py-3 rounded-lg font-medium text-white gradient-bg"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Bezig...' : 'Account aanmaken'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Al een account?{' '}
        <a href="/login" className="underline" style={{ color: 'var(--retro-teal)' }}>
          Inloggen
        </a>
      </p>
    </div>
  )
}
