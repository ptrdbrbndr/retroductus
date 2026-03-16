import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DfgSection from '@/components/DfgSection'
import ExportMenu from '@/components/ExportMenu'

interface DFGNode {
  id?: string
  activity?: string
  count: number
  avg_duration_sec?: number | null
}
interface DFGEdge {
  source?: string
  from?: string
  target?: string
  to?: string
  count: number
  avg_duration?: number
}
interface DiscoveryResult {
  dfg_nodes?: DFGNode[]
  dfg_edges?: DFGEdge[]
  start_activities?: Record<string, number>
  end_activities?: Record<string, number>
  event_count?: number
  case_count?: number
  activity_count?: number
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

  const result: DiscoveryResult = job.result || {}
  const edges = (result.dfg_edges || []).sort((a, b) => b.count - a.count).slice(0, 20)
  const nodes = result.dfg_nodes || []
  const startActs = result.start_activities || {}
  const endActs = result.end_activities || {}

  // Normalize nodes: engine kan 'activity' of 'id' gebruiken als naam
  const normalizedNodes = nodes.map(n => ({
    activity: n.activity ?? n.id ?? '',
    count: n.count,
    avg_duration_sec: n.avg_duration_sec ?? null,
  }))

  return (
    <div data-testid="project-detail">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {job.filename || job.id}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{new Date(job.created_at).toLocaleDateString('nl-NL', { dateStyle: 'long' })}</p>
        </div>
        {job.status === 'done' && normalizedNodes.length > 0 && (
          <ExportMenu targetId="viz-container-dfg" filename={`dfg-${job.id}`} />
        )}
      </div>

      {job.status !== 'done' ? (
        <div className="text-center py-16 text-gray-400">
          <p>Status: <strong className="text-white">{job.status}</strong></p>
        </div>
      ) : (
        <div id="viz-container-dfg" className="space-y-6">
          {/* Stats */}
          <div data-testid="stats-grid" className="grid grid-cols-3 gap-4">
            {[
              { label: 'Events', value: result.event_count ?? '—' },
              { label: 'Cases', value: result.case_count ?? '—' },
              { label: 'Activiteiten', value: result.activity_count ?? nodes.length },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-3xl font-semibold text-white">{stat.value}</p>
                <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* DFG visualisatie */}
          {normalizedNodes.length > 0 && (
            <DfgSection
              nodes={normalizedNodes}
              edges={edges}
              startActivities={startActs}
              endActivities={endActs}
            />
          )}

          {/* Top paths tabel */}
          <div data-testid="dfg-edges" className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <h2 className="text-white font-medium">Top 20 paden</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-5 py-3">Van</th>
                  <th className="px-5 py-3">Naar</th>
                  <th className="px-5 py-3 text-right">Aantal</th>
                </tr>
              </thead>
              <tbody>
                {edges.map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-5 py-3 text-gray-300">{e.source ?? e.from}</td>
                    <td className="px-5 py-3 text-gray-300">{e.target ?? e.to}</td>
                    <td className="px-5 py-3 text-right text-white">{e.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Start/eind activiteiten */}
          <div className="grid grid-cols-2 gap-4">
            <div data-testid="start-activities" className="rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-white font-medium mb-3">Start activiteiten</h3>
              {Object.entries(startActs).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm py-1">
                  <span className="text-gray-400">{k}</span>
                  <span className="text-white">{v}</span>
                </div>
              ))}
            </div>
            <div data-testid="end-activities" className="rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-white font-medium mb-3">Eind activiteiten</h3>
              {Object.entries(endActs).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm py-1">
                  <span className="text-gray-400">{k}</span>
                  <span className="text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alle activiteiten (chips) */}
          <div data-testid="dfg-nodes" className="rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-white font-medium mb-3">Alle activiteiten</h3>
            <div className="flex flex-wrap gap-2">
              {normalizedNodes.map(n => (
                <span key={n.activity} className="px-3 py-1 rounded-full text-sm" style={{ background: 'rgba(74,158,255,0.1)', color: '#4a9eff' }}>
                  {n.activity} <span className="opacity-60">({n.count})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
