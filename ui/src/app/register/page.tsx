'use client'

import { useState } from 'react'
import { GitBranch } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bevestig, setBevestig] = useState('')
  const [fout, setFout] = useState('')
  const [laden, setLaden] = useState(false)
  const [klaar, setKlaar] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFout('')
    if (password !== bevestig) {
      setFout('Wachtwoorden komen niet overeen.')
      return
    }
    if (password.length < 8) {
      setFout('Wachtwoord moet minimaal 8 tekens bevatten.')
      return
    }
    setLaden(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    setLaden(false)
    if (error) {
      setFout('Registratie mislukt. Probeer opnieuw.')
    } else {
      setKlaar(true)
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
          <p className="text-sm text-gray-500">Maak een gratis account aan</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {klaar ? (
            <div data-testid="register-confirm-message" className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Controleer je e-mail</h3>
              <p className="text-sm text-gray-500">
                We hebben een bevestigingslink gestuurd naar <strong>{email}</strong>.
                Klik op de link om je account te activeren.
              </p>
            </div>
          ) : (
            <form data-testid="register-form" onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mailadres</label>
                <input
                  data-testid="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  placeholder="naam@bedrijf.nl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Wachtwoord</label>
                <input
                  data-testid="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  placeholder="Minimaal 8 tekens"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Wachtwoord bevestigen</label>
                <input
                  data-testid="register-password-confirm"
                  type="password"
                  value={bevestig}
                  onChange={(e) => setBevestig(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  placeholder="Herhaal wachtwoord"
                />
              </div>

              {fout && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{fout}</p>
              )}

              <button
                data-testid="register-submit"
                type="submit"
                disabled={laden}
                className="w-full py-2.5 text-sm font-medium text-white rounded-lg gradient-bg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {laden ? 'Bezig...' : 'Account aanmaken'}
              </button>
            </form>
          )}

          {!klaar && (
            <p className="mt-6 text-center text-sm text-gray-500">
              Al een account?{' '}
              <a href="/login" className="font-medium" style={{ color: 'var(--retro-teal)' }}>
                Inloggen
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
