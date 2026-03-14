import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    done: '#22c55e',
    processing: '#f59e0b',
    failed: '#ef4444',
    pending: '#6b7280',
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${colors[status] || '#6b7280'}20`, color: colors[status] || '#6b7280' }}>
      {status}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: jobs } = await supabase
    .from('mining_jobs')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div data-testid="dashboard">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Mijn projecten</h1>
        <Link
          href="/app/projects/new"
          data-testid="dashboard-new-project"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
        >
          + Nieuw project
        </Link>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div data-testid="dashboard-empty" className="text-center py-24 rounded-2xl" style={{ border: '1px dashed rgba(255,255,255,0.12)' }}>
          <p className="text-gray-400 mb-4">Je hebt nog geen projecten.</p>
          <Link
            href="/app/projects/new"
            className="px-6 py-3 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
          >
            Upload je eerste log
          </Link>
        </div>
      ) : (
        <div data-testid="projects-list" className="space-y-3">
          {jobs.map(job => (
            <Link
              key={job.id}
              href={`/app/projects/${job.id}`}
              data-testid={`project-${job.id}`}
              className="flex items-center justify-between p-5 rounded-xl hover:bg-white/5 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div>
                <p className="text-white font-medium">{job.filename || job.id}</p>
                <p className="text-gray-500 text-sm">{new Date(job.created_at).toLocaleDateString('nl-NL')}</p>
              </div>
              <StatusBadge status={job.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
