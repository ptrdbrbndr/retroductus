'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { registerUser } from './actions'

const DPA_REQUIRED_ERROR =
  'Je moet de Verwerkersovereenkomst accepteren om verder te gaan.'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dpaAccepted, setDpaAccepted] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!dpaAccepted) {
      setError(DPA_REQUIRED_ERROR)
      return
    }

    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)
    formData.set('dpa_accepted', 'true')

    startTransition(async () => {
      const result = await registerUser(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      if (result.requiresEmailConfirm) {
        setDone(true)
      } else {
        router.refresh()
        router.push('/app')
      }
    })
  }

  if (done) {
    return (
      <div
        data-testid="register-done"
        className="rounded-2xl p-8 text-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-4xl mb-4" aria-hidden="true">✉️</div>
        <h2 className="text-xl font-semibold text-white mb-2">Controleer je e-mail</h2>
        <p className="text-gray-400 text-sm">
          We hebben een bevestigingslink naar <strong className="text-white">{email}</strong> gestuurd.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-8"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <h1
        className="text-2xl font-semibold text-white mb-6"
        style={{ fontFamily: 'Cormorant Garamond, serif' }}
      >
        Account aanmaken
      </h1>
      <form data-testid="register-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="register-email" className="block text-sm text-gray-400 mb-1">
            E-mailadres
          </label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className="block text-sm text-gray-400 mb-1">
            Wachtwoord
          </label>
          <input
            id="register-password"
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
        <div className="flex items-start gap-3">
          <input
            data-testid="register-dpa-checkbox"
            type="checkbox"
            id="dpa-accept"
            checked={dpaAccepted}
            onChange={e => setDpaAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-600 accent-blue-500 cursor-pointer"
            aria-describedby="dpa-help"
          />
          <label
            htmlFor="dpa-accept"
            id="dpa-help"
            className="text-sm text-gray-400 leading-relaxed cursor-pointer"
          >
            Ik ga akkoord met de{' '}
            <Link
              href="/dpa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              verwerkersovereenkomst
            </Link>
            {' '}(vereist voor het uploaden van bedrijfsdata)
          </label>
        </div>
        {error && (
          <p data-testid="register-error" role="alert" className="text-red-400 text-sm">
            {error}
          </p>
        )}
        <button
          data-testid="register-submit"
          type="submit"
          disabled={isPending || !dpaAccepted}
          aria-disabled={isPending || !dpaAccepted}
          className="w-full py-3 rounded-lg font-medium text-white text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
        >
          {isPending ? 'Bezig...' : 'Registreer'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-6">
        Al een account?{' '}
        <Link href="/login" className="text-blue-400 hover:underline">
          Inloggen
        </Link>
      </p>
    </div>
  )
}
