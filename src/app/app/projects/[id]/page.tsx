import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface DfgNode {
  activity: string
  count: number
  avg_duration_sec: number | null
}

interface DfgEdge {
  from: string
  to: string
  count: number
}

interface MiningResult {
  dfg_nodes: DfgNode[]
  dfg_edges: DfgEdge[]
  start_activities: Record<string, number>
  end_activities: Record<string, number>
  performance: { activity: string; avg_duration_sec: number; case_count: number }[]
}

interface MiningJob {
  id: string
  filename: string | null
  status: string
  event_count: number | null
  created_at: string
  completed_at: string | null
  error_message: string | null
  result: MiningResult | null
}

function formatDuration(sec: number | null): string {
  if (sec === null) return '—'
  if (sec < 60) return `${sec.toFixed(0)}s`
  if (sec < 3600) return `${(sec / 60).toFixed(1)} min`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)} uur`
  return `${(sec / 86400).toFixed(1)} dagen`
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('mining_jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (!job) notFound()

  const j = job as MiningJob
  const result = j.result as MiningResult | null

  return (
    <div data-testid="project-detail">
      {/* Header */}
      <div className="mb-8">
        <a href="/app" data-testid="back-to-dashboard" className="text-sm" style={{ color: 'var(--retro-teal)' }}>
          ← Terug naar projecten
        </a>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {j.filename || `Analyse ${j.id.slice(0, 8)}`}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {j.event_count?.toLocaleString()} events ·{' '}
              {new Date(j.created_at).toLocaleDateString('nl-NL', { dateStyle: 'long' })}
            </p>
          </div>
          {j.status === 'done' && (
            <a
              href={`/app/projects/${id}/performance`}
              data-testid="nav-performance"
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              📈 Performance
            </a>
          )}
        </div>
      </div>

      {j.status === 'error' && (
        <div className="rounded-xl p-6 mb-6" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          data-testid="job-error">
          <div className="text-white font-medium mb-1">Analyse mislukt</div>
          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{j.error_message}</div>
        </div>
      )}

      {j.status === 'running' && (
        <div className="rounded-xl p-6 mb-6 text-center" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}
          data-testid="job-running">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-white font-medium">Analyse wordt uitgevoerd...</div>
          <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Vernieuw de pagina om de status te zien.</div>
        </div>
      )}

      {result && (
        <div className="space-y-8">
          {/* Statistieken */}
          <div className="grid grid-cols-3 gap-4" data-testid="stats-grid">
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Activiteiten</div>
              <div className="text-2xl font-semibold text-white">{result.dfg_nodes.length}</div>
            </div>
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Unieke paden</div>
              <div className="text-2xl font-semibold text-white">{result.dfg_edges.length}</div>
            </div>
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Startactiviteiten</div>
              <div className="text-2xl font-semibold text-white">{Object.keys(result.start_activities).length}</div>
            </div>
          </div>

          {/* Process flow — top paden */}
          <div data-testid="dfg-edges">
            <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Procesflow — meest voorkomende paden
            </h2>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                    <th className="px-5 py-3 text-left font-medium">Van</th>
                    <th className="px-5 py-3 text-left font-medium">Naar</th>
                    <th className="px-5 py-3 text-right font-medium">Frequentie</th>
                  </tr>
                </thead>
                <tbody>
                  {result.dfg_edges.slice(0, 20).map((edge, i) => (
                    <tr
                      key={i}
                      data-testid={`edge-${i}`}
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)' }}
                    >
                      <td className="px-5 py-3">{edge.from}</td>
                      <td className="px-5 py-3" style={{ color: 'var(--retro-teal)' }}>→ {edge.to}</td>
                      <td className="px-5 py-3 text-right font-medium">{edge.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activiteiten tabel */}
          <div data-testid="dfg-nodes">
            <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Activiteiten
            </h2>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                    <th className="px-5 py-3 text-left font-medium">Activiteit</th>
                    <th className="px-5 py-3 text-right font-medium">Aantal</th>
                    <th className="px-5 py-3 text-right font-medium">Gem. duur</th>
                  </tr>
                </thead>
                <tbody>
                  {result.dfg_nodes
                    .sort((a, b) => b.count - a.count)
                    .map((node, i) => (
                      <tr
                        key={i}
                        data-testid={`node-${i}`}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)' }}
                      >
                        <td className="px-5 py-3">{node.activity}</td>
                        <td className="px-5 py-3 text-right">{node.count.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {formatDuration(node.avg_duration_sec)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Start/end activiteiten */}
          <div className="grid grid-cols-2 gap-6">
            <div data-testid="start-activities">
              <h2 className="text-base font-semibold text-white mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Startactiviteiten
              </h2>
              <div className="space-y-2">
                {Object.entries(result.start_activities).sort(([, a], [, b]) => b - a).map(([act, cnt]) => (
                  <div key={act} className="flex justify-between px-4 py-2 rounded-lg text-sm"
                    style={{ background: 'rgba(46,196,182,0.08)', border: '1px solid rgba(46,196,182,0.15)' }}>
                    <span className="text-white">{act}</span>
                    <span style={{ color: 'var(--retro-teal)' }}>{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
            <div data-testid="end-activities">
              <h2 className="text-base font-semibold text-white mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Eindactiviteiten
              </h2>
              <div className="space-y-2">
                {Object.entries(result.end_activities).sort(([, a], [, b]) => b - a).map(([act, cnt]) => (
                  <div key={act} className="flex justify-between px-4 py-2 rounded-lg text-sm"
                    style={{ background: 'rgba(27,107,147,0.1)', border: '1px solid rgba(27,107,147,0.2)' }}>
                    <span className="text-white">{act}</span>
                    <span style={{ color: '#1B6B93' }}>{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
