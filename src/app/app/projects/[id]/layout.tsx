import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProjectNav from '@/components/ProjectNav'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('mining_jobs')
    .select('id, filename, status, event_count, created_at, result')
    .eq('id', id)
    .single()

  if (!job) notFound()

  const nodeCount = job.result?.dfg_nodes?.length ?? 0
  const caseCount = job.result?.case_durations?.case_count ?? null
  const dateStr = new Date(job.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div data-testid="project-layout" className="flex gap-6" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* Sidebar */}
      <aside
        className="shrink-0 sticky self-start"
        style={{ width: 220, top: 88 }}
      >
        {/* Project info */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <Link
            href="/app"
            data-testid="sidebar-back-to-projects"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-3 transition-colors"
          >
            ← Alle projecten
          </Link>

          <p
            className="text-white text-sm font-medium leading-snug mb-2"
            title={job.filename || job.id}
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {job.filename || job.id}
          </p>
          <p className="text-gray-600 text-xs">{dateStr}</p>

          {job.status === 'done' && (
            <div className="flex flex-wrap gap-2 mt-3">
              {job.event_count != null && (
                <span className="text-xs rounded px-1.5 py-0.5" style={{ background: 'rgba(74,158,255,0.08)', color: '#4a9eff' }}>
                  {job.event_count} events
                </span>
              )}
              {nodeCount > 0 && (
                <span className="text-xs rounded px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
                  {nodeCount} activiteiten
                </span>
              )}
              {caseCount != null && (
                <span className="text-xs rounded px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
                  {caseCount} cases
                </span>
              )}
            </div>
          )}

          {job.status !== 'done' && (
            <span
              className="inline-block mt-2 text-xs rounded-full px-2 py-0.5"
              style={{
                background: job.status === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.12)',
                color: job.status === 'error' ? '#f87171' : '#fbbf24',
              }}
            >
              {job.status}
            </span>
          )}
        </div>

        {/* Visualisatie navigatie */}
        {job.status === 'done' && (
          <div
            className="rounded-xl p-3 mb-4"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
          >
            <p className="text-gray-600 text-xs px-3 mb-2 uppercase tracking-wider">Visualisaties</p>
            <ProjectNav id={id} />
          </div>
        )}

        {/* Acties */}
        <div className="space-y-2">
          <Link
            href="/app/projects/new"
            data-testid="sidebar-new-project"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
          >
            + Nieuwe analyse
          </Link>
        </div>
      </aside>

      {/* Hoofdcontent */}
      <main className="flex-1 min-w-0">
        {children}
      </main>

    </div>
  )
}
