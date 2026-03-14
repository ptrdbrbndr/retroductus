'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/app')
    }
  }

  return (
    <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <h1 className="text-2xl font-semibold text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        Inloggen
      </h1>
      <form data-testid="login-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">E-mailadres</label>
          <input
            data-testid="login-email"
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
            data-testid="login-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          data-testid="login-submit"
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-medium text-white text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
        >
          {loading ? 'Bezig...' : 'Inloggen'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-6">
        Nog geen account?{' '}
        <Link href="/register" className="text-blue-400 hover:underline">Registreer hier</Link>
      </p>
    </div>
  )
}
