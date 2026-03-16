'use client'

import { useState, useEffect } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type IssueCategory = 'bug' | 'inhoud' | 'technisch' | 'toegang' | 'suggestie' | 'overig'
type IssuePriority = 'laag' | 'normaal' | 'hoog' | 'kritiek'
type IssueStatus = 'open' | 'in_behandeling' | 'opgelost' | 'gesloten'

interface Issue {
  id: string
  reporter_name: string | null
  reporter_email: string | null
  page_url: string | null
  category: IssueCategory
  priority: IssuePriority
  status: IssueStatus
  title: string
  description: string
  created_at: string
}

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  bug: 'Bug',
  inhoud: 'Inhoud',
  technisch: 'Technisch',
  toegang: 'Toegang',
  suggestie: 'Suggestie',
  overig: 'Overig',
}

const PRIORITY_STYLES: Record<IssuePriority, React.CSSProperties> = {
  laag: { backgroundColor: 'rgba(255,255,255,0.08)', color: '#9ca3af' },
  normaal: { backgroundColor: 'rgba(74,158,255,0.15)', color: '#4a9eff' },
  hoog: { backgroundColor: 'rgba(251,146,60,0.15)', color: '#fb923c' },
  kritiek: { backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' },
}

const STATUS_STYLES: Record<IssueStatus, React.CSSProperties> = {
  open: { backgroundColor: 'rgba(234,179,8,0.15)', color: '#eab308' },
  in_behandeling: { backgroundColor: 'rgba(74,158,255,0.15)', color: '#4a9eff' },
  opgelost: { backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  gesloten: { backgroundColor: 'rgba(255,255,255,0.06)', color: '#6b7280' },
}

const STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'Open',
  in_behandeling: 'In behandeling',
  opgelost: 'Opgelost',
  gesloten: 'Gesloten',
}

export default function IssuesOverviewPage() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: plan } = await supabase
        .from('user_plans')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()

      if (plan?.is_admin) setIsAdmin(true)

      const res = await fetch('/api/issues')
      if (!res.ok) {
        setError('Ophalen mislukt')
        setLoading(false)
        return
      }
      const data = await res.json()
      setIssues(data.issues)
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Dit issue permanent verwijderen?')) return
    setDeletingId(id)
    const res = await fetch(`/api/issues/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setIssues((prev) => prev.filter((i) => i.id !== id))
      if (expandedId === id) setExpandedId(null)
    } else {
      alert('Verwijderen mislukt. Probeer het opnieuw.')
    }
    setDeletingId(null)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Gemelde issues</h1>
        <p className="text-sm text-gray-400 mt-1">
          Overzicht van alle door gebruikers ingediende meldingen.
          {isAdmin ? ' Als beheerder kun je issues verwijderen.' : ''}
        </p>
      </div>

      {loading && (
        <p className="text-sm text-gray-400">Laden...</p>
      )}

      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</div>
      )}

      {!loading && !error && issues.length === 0 && (
        <div className="rounded-xl p-8 text-center text-sm text-gray-500" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Nog geen issues gemeld.
        </div>
      )}

      {!loading && issues.length > 0 && (
        <div data-testid="issues-table" className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {issues.map((issue, idx) => (
            <div
              key={issue.id}
              data-testid="issue-row"
              style={idx > 0 ? { borderTop: '1px solid rgba(255,255,255,0.06)' } : undefined}
            >
              {/* Samengevatte rij */}
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
              >
                <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full" style={STATUS_STYLES[issue.status]}>
                  {STATUS_LABELS[issue.status]}
                </span>
                <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full" style={PRIORITY_STYLES[issue.priority]}>
                  {issue.priority}
                </span>
                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full text-gray-400" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  {CATEGORY_LABELS[issue.category]}
                </span>
                <span data-testid="issue-title" className="flex-1 text-sm font-medium text-white truncate">
                  {issue.title}
                </span>
                <span className="shrink-0 text-xs text-gray-500 hidden sm:block">
                  {formatDate(issue.created_at)}
                </span>
                {expandedId === issue.id
                  ? <ChevronUp className="shrink-0 h-4 w-4 text-gray-500" />
                  : <ChevronDown className="shrink-0 h-4 w-4 text-gray-500" />
                }
              </div>

              {/* Detail */}
              {expandedId === issue.id && (
                <div className="px-5 pb-5" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <p className="text-sm text-gray-300 mt-3 whitespace-pre-wrap">{issue.description}</p>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                    {issue.reporter_name && <span>Melder: {issue.reporter_name}</span>}
                    {issue.reporter_email && (
                      <span>E-mail: <a href={`mailto:${issue.reporter_email}`} className="text-blue-400 hover:underline">{issue.reporter_email}</a></span>
                    )}
                    {issue.page_url && <span>Pagina: {issue.page_url}</span>}
                    <span>Datum: {formatDate(issue.created_at)}</span>
                  </div>

                  {isAdmin && (
                    <div className="mt-4">
                      <button
                        data-testid="delete-issue-btn"
                        onClick={() => handleDelete(issue.id)}
                        disabled={deletingId === issue.id}
                        className="flex items-center gap-1.5 text-xs disabled:opacity-50"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === issue.id ? 'Verwijderen...' : 'Verwijderen'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
