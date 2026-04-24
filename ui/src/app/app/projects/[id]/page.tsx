'use client'

import { useEffect, useState, use } from 'react'
import { Loader2, XCircle, GitBranch, BarChart2, List, Zap } from 'lucide-react'
import { DFGGraph } from '@/components/mining/DFGGraph'
import { PerformanceTab } from '@/components/mining/PerformanceTab'
import { VariantenTab } from '@/components/mining/VariantenTab'
import { InsightsTab } from '@/components/mining/InsightsTab'

interface Job {
  id: string
  status: 'pending' | 'running' | 'done' | 'error'
  result: Record<string, unknown> | null
  event_count: number | null
  error_message: string | null
}

type TabId = 'procesmodel' | 'performance' | 'varianten' | 'insights'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'procesmodel', label: 'Procesmodel',  icon: <GitBranch className="h-4 w-4" /> },
  { id: 'performance', label: 'Performance',  icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'varianten',   label: 'Varianten',    icon: <List className="h-4 w-4" /> },
  { id: 'insights',    label: 'AI Inzichten', icon: <Zap className="h-4 w-4" /> },
]

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [job, setJob] = useState<Job | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('procesmodel')

  useEffect(() => {
    let stopped = false
    const poll = async () => {
      const resp = await fetch(`/api/jobs/${id}`)
      if (resp.status === 404) { setNotFound(true); return }
      if (!resp.ok) return
      const data: Job = await resp.json()
      if (!stopped) {
        setJob(data)
        if (data.status !== 'done' && data.status !== 'error') {
          setTimeout(poll, 2000)
        }
      }
    }
    poll()
    return () => { stopped = true }
  }, [id])

  if (notFound) {
    return (
      <div data-testid="project-detail" className="flex flex-col items-center justify-center h-64 text-center">
        <XCircle className="h-10 w-10 text-red-300 mb-3" />
        <p className="text-gray-600 font-medium">Analyse niet gevonden</p>
        <p className="text-sm text-gray-400 mt-1">Deze analyse bestaat niet of je hebt er geen toegang toe.</p>
        <a href="/app" className="mt-4 text-sm font-medium" style={{ color: 'var(--retro-teal)' }}>← Terug naar dashboard</a>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    )
  }

  if (job.status === 'error') {
    return (
      <div data-testid="project-detail" className="flex flex-col items-center justify-center h-64 text-center">
        <XCircle className="h-10 w-10 text-red-300 mb-3" />
        <p className="text-gray-700 font-medium">Analyse mislukt</p>
        {job.error_message && <p className="text-sm text-gray-500 mt-2 max-w-md">{job.error_message}</p>}
        <a href="/app" className="mt-4 text-sm font-medium" style={{ color: 'var(--retro-teal)' }}>← Terug naar dashboard</a>
      </div>
    )
  }

  if (job.status === 'pending' || job.status === 'running') {
    return (
      <div data-testid="project-detail" className="flex flex-col items-center justify-center h-64 text-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: 'var(--retro-teal)' }} />
        <p className="font-medium text-gray-700">Analyse wordt uitgevoerd…</p>
        <p className="text-sm text-gray-400 mt-1">Dit duurt gemiddeld 15–30 seconden</p>
      </div>
    )
  }

  const result = job.result as Record<string, unknown>

  return (
    <div data-testid="project-detail" className="max-w-6xl mx-auto">
      <div className="mb-6">
        <a href="/app" className="text-xs text-gray-400 hover:text-gray-600 mb-1 inline-block">← Dashboard</a>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--retro-navy)' }}>Analyseresultaten</h1>
        {job.event_count && (
          <p className="text-sm text-gray-500 mt-0.5">{job.event_count.toLocaleString('nl-NL')} events verwerkt</p>
        )}
      </div>

      {/* Stats grid voor testid */}
      <div data-testid="stats-grid" className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Events', value: job.event_count?.toLocaleString('nl-NL') ?? '—' },
          { label: 'Activiteiten', value: ((result.dfg_nodes as unknown[]) ?? []).length },
          { label: 'Paden', value: ((result.dfg_edges as unknown[]) ?? []).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--retro-navy)', fontFamily: 'Cormorant Garamond, serif' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id: tabId, label, icon }) => (
          <button
            key={tabId}
            data-testid={`tab-${tabId}`}
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tabId ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {activeTab === 'procesmodel' && (
          <div data-testid="dfg-graph">
            <DFGGraph result={result} />
          </div>
        )}
        {activeTab === 'performance' && <PerformanceTab result={result} />}
        {activeTab === 'varianten'   && <VariantenTab result={result} />}
        {activeTab === 'insights'    && <InsightsTab jobId={id} />}
      </div>
    </div>
  )
}
