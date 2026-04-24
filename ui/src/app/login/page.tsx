'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GitBranch } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFout('')
    setLaden(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLaden(false)
    if (error) {
      setFout('E-mailadres of wachtwoord onjuist.')
    } else {
      router.push('/app')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--retro-stone)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <GitBranch className="h-5 w-5" style={{ color: 'var(--retro-teal)' }} />
            <span className="text-xl font-semibold" style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--retro-navy)' }}>
              Retroductus
            </span>
          </div>
          <p className="text-sm text-gray-500">Log in om door te gaan</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form data-testid="login-form" onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mailadres</label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': 'var(--retro-teal)' } as React.CSSProperties}
                placeholder="naam@bedrijf.nl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Wachtwoord</label>
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {fout && (
              <p data-testid="login-error" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {fout}
              </p>
            )}

            <button
              data-testid="login-submit"
              type="submit"
              disabled={laden}
              className="w-full py-2.5 text-sm font-medium text-white rounded-lg gradient-bg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {laden ? 'Bezig...' : 'Inloggen'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Nog geen account?{' '}
            <a href="/register" className="font-medium" style={{ color: 'var(--retro-teal)' }}>
              Registreren
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
