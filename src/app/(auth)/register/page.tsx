'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
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
      <div data-testid="register-done" className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-4xl mb-4">✉️</div>
        <h2 className="text-xl font-semibold text-white mb-2">Controleer je e-mail</h2>
        <p className="text-gray-400 text-sm">We hebben een bevestigingslink naar <strong className="text-white">{email}</strong> gestuurd.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h1 className="text-2xl font-semibold text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        Account aanmaken
      </h1>
      <form data-testid="register-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">E-mailadres</label>
          <input
            data-testid="register-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder="naam@bedrijf.nl"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Wachtwoord</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder="Minimaal 8 tekens"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          data-testid="register-submit"
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-medium text-white text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
        >
          {loading ? 'Bezig...' : 'Registreer'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-6">
        Al een account?{' '}
        <Link href="/login" className="text-blue-400 hover:underline">Inloggen</Link>
      </p>
    </div>
  )
}
