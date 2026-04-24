'use client'

import { useState } from 'react'
import { AlertCircle, X, ChevronDown } from 'lucide-react'

type IssueCategory = 'bug' | 'inhoud' | 'technisch' | 'toegang' | 'suggestie' | 'overig'
type IssuePriority = 'laag' | 'normaal' | 'hoog' | 'kritiek'

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  bug: 'Bug / Fout',
  inhoud: 'Inhoud klopt niet',
  technisch: 'Technisch probleem',
  toegang: 'Toegang / inlogprobleem',
  suggestie: 'Suggestie',
  overig: 'Overig',
}

const PRIORITY_LABELS: Record<IssuePriority, string> = {
  laag: 'Laag — kleine storing, geen haast',
  normaal: 'Normaal — werkt niet zoals verwacht',
  hoog: 'Hoog — belemmert mijn gebruik',
  kritiek: 'Kritiek — volledig geblokkeerd',
}

interface FormState {
  reporter_name: string
  reporter_email: string
  category: IssueCategory
  priority: IssuePriority
  title: string
  description: string
}

const DEFAULT_FORM: FormState = {
  reporter_name: '',
  reporter_email: '',
  category: 'bug',
  priority: 'normaal',
  title: '',
  description: '',
}

export function IssueReportButton() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleOpen() {
    setOpen(true)
    setError(null)
    setSuccess(false)
    setForm(DEFAULT_FORM)
  }

  function handleClose() {
    setOpen(false)
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          page_url: window.location.pathname,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Er is een fout opgetreden. Probeer het opnieuw.')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 2500)
    } catch {
      setError('Verbinding mislukt. Controleer je internetverbinding.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Zwevende knop */}
      <button
        data-testid="report-issue-btn"
        onClick={handleOpen}
        aria-label="Probleem melden"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
      >
        <AlertCircle className="h-4 w-4" />
        <span>Probleem melden</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div
            data-testid="issue-modal"
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
            style={{ backgroundColor: '#0f2140', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-base font-semibold">Probleem melden</h2>
              <button
                data-testid="issue-modal-close"
                onClick={handleClose}
                aria-label="Sluiten"
                className="p-1 rounded-md text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Succes */}
            {success ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(74,158,255,0.15)' }}>
                  <AlertCircle className="h-6 w-6" style={{ color: '#4a9eff' }} />
                </div>
                <p className="font-medium">Bedankt! Je melding is ontvangen.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Naam & e-mail */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">
                      Naam <span className="text-gray-500 font-normal">(optioneel)</span>
                    </label>
                    <input
                      type="text"
                      value={form.reporter_name}
                      onChange={(e) => set('reporter_name', e.target.value)}
                      className="w-full px-3 py-2 rounded-md text-sm text-white focus:outline-none focus:ring-2"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', '--tw-ring-color': '#4a9eff' } as React.CSSProperties}
                      placeholder="Jouw naam"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">
                      E-mail <span className="text-gray-500 font-normal">(optioneel)</span>
                    </label>
                    <input
                      type="email"
                      value={form.reporter_email}
                      onChange={(e) => set('reporter_email', e.target.value)}
                      className="w-full px-3 py-2 rounded-md text-sm text-white focus:outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                      placeholder="jij@voorbeeld.nl"
                    />
                  </div>
                </div>

                {/* Categorie */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Categorie</label>
                  <div className="relative">
                    <select
                      data-testid="issue-category"
                      value={form.category}
                      onChange={(e) => set('category', e.target.value as IssueCategory)}
                      className="w-full px-3 py-2 rounded-md text-sm text-white appearance-none focus:outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      {(Object.keys(CATEGORY_LABELS) as IssueCategory[]).map((c) => (
                        <option key={c} value={c} style={{ backgroundColor: '#0f2140' }}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Prioriteit */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Ernst</label>
                  <div className="relative">
                    <select
                      data-testid="issue-priority"
                      value={form.priority}
                      onChange={(e) => set('priority', e.target.value as IssuePriority)}
                      className="w-full px-3 py-2 rounded-md text-sm text-white appearance-none focus:outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      {(Object.keys(PRIORITY_LABELS) as IssuePriority[]).map((p) => (
                        <option key={p} value={p} style={{ backgroundColor: '#0f2140' }}>{PRIORITY_LABELS[p]}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Titel */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">
                    Korte omschrijving <span className="text-red-400">*</span>
                  </label>
                  <input
                    data-testid="issue-title"
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    className="w-full px-3 py-2 rounded-md text-sm text-white focus:outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    placeholder="Wat gaat er mis?"
                  />
                </div>

                {/* Beschrijving */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">
                    Uitgebreide beschrijving <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    data-testid="issue-description"
                    required
                    rows={4}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    className="w-full px-3 py-2 rounded-md text-sm text-white focus:outline-none resize-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    placeholder="Beschrijf stap voor stap wat je probeerde te doen en wat er gebeurde..."
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 rounded-md px-3 py-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>{error}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-300 rounded-md hover:text-white"
                    style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    Annuleren
                  </button>
                  <button
                    data-testid="submit-issue-btn"
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
                  >
                    {submitting ? 'Verzenden...' : 'Melding indienen'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
