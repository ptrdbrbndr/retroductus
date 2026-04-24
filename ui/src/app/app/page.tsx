'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Upload, FlaskConical, Clock, CheckCircle, XCircle, Loader2, ArrowRight, Plus } from 'lucide-react'

interface Job {
  id: string
  status: 'pending' | 'running' | 'done' | 'error'
  event_count: number | null
  completed_at: string | null
  error_message: string | null
  created_at: string
}

function StatusBadge({ status }: { status: Job['status'] }) {
  const map = {
    pending: { label: 'Wachten', cls: 'bg-gray-100 text-gray-600',   icon: <Clock className="h-3 w-3" /> },
    running: { label: 'Bezig',   cls: 'bg-blue-50 text-blue-600',    icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    done:    { label: 'Klaar',   cls: 'bg-green-50 text-green-600',  icon: <CheckCircle className="h-3 w-3" /> },
    error:   { label: 'Mislukt', cls: 'bg-red-50 text-red-600',      icon: <XCircle className="h-3 w-3" /> },
  }
  const { label, cls, icon } = map[status]
  return (
    <span data-testid="job-status-badge" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {icon}{label}
    </span>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchJobs = useCallback(async () => {
    const resp = await fetch('/api/jobs')
    if (resp.ok) setJobs(await resp.json())
  }, [])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(() => {
      setJobs(prev => {
        const hasActive = prev.some(j => j.status === 'pending' || j.status === 'running')
        if (hasActive) fetchJobs()
        return prev
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  return (
    <div data-testid="dashboard" className="max-w-3xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--retro-navy)' }}>Dashboard</h1>
          <p className="text-sm text-gray-500">Overzicht van al je procesanalyses.</p>
        </div>
        <a
          href="/app/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg gradient-bg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Nieuwe analyse
        </a>
      </div>

      {/* Projecten/jobs lijst */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-base font-semibold text-gray-900">Analyses</h2>
        </div>

        {jobs.length === 0 ? (
          <div data-testid="projects-list" className="px-6 py-12 text-center">
            <FlaskConical className="h-8 w-8 mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400 mb-4">Nog geen analyses.</p>
            <a
              href="/app/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg gradient-bg hover:opacity-90"
            >
              <Upload className="h-4 w-4" /> Upload je eerste event log
            </a>
          </div>
        ) : (
          <table data-testid="projects-list" className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Events</th>
                <th className="px-6 py-3 text-left font-medium">Datum</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.map((job) => (
                <tr data-testid="job-row" key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5"><StatusBadge status={job.status} /></td>
                  <td className="px-6 py-3.5 text-gray-600">
                    {job.event_count ? job.event_count.toLocaleString('nl-NL') : '—'}
                  </td>
                  <td className="px-6 py-3.5 text-gray-500">{fmt(job.created_at)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <a
                      data-testid="job-view-link"
                      href={`/app/projects/${job.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                      style={{ color: 'var(--retro-teal)' }}
                    >
                      {job.status === 'done' ? 'Bekijken' : 'Volgen'} <ArrowRight className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
