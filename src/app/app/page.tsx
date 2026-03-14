import { createClient } from '@/lib/supabase/server'

interface MiningJob {
  id: string
  filename: string | null
  source: string
  status: string
  event_count: number | null
  created_at: string
  completed_at: string | null
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    done: '#2EC4B6',
    running: '#f59e0b',
    pending: 'rgba(255,255,255,0.4)',
    error: '#ef4444',
  }
  const labels: Record<string, string> = {
    done: 'Gereed',
    running: 'Bezig...',
    pending: 'In wachtrij',
    error: 'Fout',
  }
  return (
    <span className="text-xs px-2 py-1 rounded-full font-medium"
      style={{ background: `${colors[status]}22`, color: colors[status] || 'white', border: `1px solid ${colors[status]}44` }}>
      {labels[status] || status}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: jobs } = await supabase
    .from('mining_jobs')
    .select('id, filename, source, status, event_count, created_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div data-testid="dashboard">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Projecten
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Jouw process mining analyses
          </p>
        </div>
        <a
          href="/app/projects/new"
          data-testid="dashboard-new-project"
          className="px-4 py-2 rounded-lg font-medium text-white gradient-bg text-sm"
        >
          + Nieuw project
        </a>
      </div>

      {(!jobs || jobs.length === 0) ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)' }}
          data-testid="dashboard-empty"
        >
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-white text-lg font-medium mb-2">Nog geen analyses</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Upload een CSV-eventlog om te beginnen met process mining.
          </p>
          <a href="/app/projects/new" data-testid="dashboard-empty-cta"
            className="inline-block px-6 py-3 rounded-lg font-medium text-white gradient-bg text-sm">
            Eerste analyse starten
          </a>
        </div>
      ) : (
        <div className="space-y-3" data-testid="projects-list">
          {(jobs as MiningJob[]).map(job => (
            <a
              key={job.id}
              href={`/app/projects/${job.id}`}
              data-testid={`project-${job.id}`}
              className="flex items-center justify-between p-5 rounded-xl transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl">
                  {job.source === 'flowable' ? '⚙️' : '📄'}
                </div>
                <div>
                  <div className="text-white font-medium">
                    {job.filename || `Analyse ${job.id.slice(0, 8)}`}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {job.event_count ? `${job.event_count.toLocaleString()} events` : '—'} ·{' '}
                    {new Date(job.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <StatusBadge status={job.status} />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
