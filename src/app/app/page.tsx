import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  done:    { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e', label: 'Gereed' },
  running: { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', label: 'Analyseren…' },
  pending: { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af', label: 'Wachten' },
  error:   { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', label: 'Mislukt' },
}

function durLabel(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}u`
  return `${(sec / 86400).toFixed(1)}d`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: jobs } = await supabase
    .from('mining_jobs')
    .select('id, filename, status, event_count, created_at, result')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div data-testid="dashboard" className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Mijn analyses
          </h1>
          {jobs && jobs.length > 0 && (
            <p className="text-gray-500 text-sm mt-1">{jobs.length} {jobs.length === 1 ? 'analyse' : 'analyses'}</p>
          )}
        </div>
        <Link
          href="/app/projects/new"
          data-testid="dashboard-new-project"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
        >
          <span aria-hidden="true">+</span>
          Nieuwe analyse
        </Link>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div data-testid="dashboard-empty" className="text-center py-28 rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-2xl"
            style={{ background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.15)' }}
            aria-hidden="true"
          >
            ⬡
          </div>
          <p className="text-white font-medium mb-2">Geen analyses gevonden</p>
          <p className="text-gray-500 text-sm mb-8">Upload een CSV of XES event log om je eerste procesanalyse te starten</p>
          <Link
            href="/app/projects/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
          >
            Upload je eerste log
          </Link>
        </div>
      ) : (
        <div data-testid="projects-list" className="space-y-3">
          {jobs.map(job => {
            const status = STATUS_COLORS[job.status] ?? STATUS_COLORS.pending
            const nodeCount: number = job.result?.dfg_nodes?.length ?? 0
            const p50: number | null = job.result?.case_durations?.p50_sec ?? null
            const variantCount: number = job.result?.trace_variants?.length ?? 0
            const dateStr = new Date(job.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })

            return (
              <Link
                key={job.id}
                href={`/app/projects/${job.id}`}
                data-testid={`project-${job.id}`}
                className="group flex items-center justify-between p-5 rounded-xl transition-colors hover:bg-white/[0.03]"
                style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: 'rgba(74,158,255,0.1)', color: '#4a9eff' }}
                    aria-hidden="true"
                  >
                    ⬡
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate group-hover:text-blue-300 transition-colors">
                      {job.filename || job.id}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{dateStr}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-4">
                  {job.status === 'done' && (
                    <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                      {job.event_count != null && (
                        <span>{job.event_count.toLocaleString('nl-NL')} events</span>
                      )}
                      {nodeCount > 0 && <span>{nodeCount} activiteiten</span>}
                      {variantCount > 0 && <span>{variantCount} varianten</span>}
                      {p50 != null && <span>mediaan {durLabel(p50)}</span>}
                    </div>
                  )}
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                    style={{ background: status.bg, color: status.text }}
                  >
                    {status.label}
                  </span>
                  <svg
                    className="text-gray-600 group-hover:text-gray-400 transition-colors"
                    width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                  >
                    <path d="M5 2.5l4.5 4.5L5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
