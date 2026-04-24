'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { DfgMode } from './DfgGraph'

const DfgGraph = dynamic(() => import('./DfgGraph'), {
  ssr: false,
  loading: () => (
    <div data-testid="dfg-graph-loading" style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
      <p className="text-gray-400 text-sm">Process model laden...</p>
    </div>
  ),
})

interface DfgNode {
  activity: string
  count: number
  avg_duration_sec?: number | null
}

interface DfgEdge {
  from?: string
  source?: string
  to?: string
  target?: string
  count: number
  avg_duration_sec?: number | null
}

interface Props {
  nodes: DfgNode[]
  edges: DfgEdge[]
  startActivities: Record<string, number>
  endActivities: Record<string, number>
}

export default function DfgSection(props: Props) {
  const [mode, setMode] = useState<DfgMode>('frequency')

  const hasPerfData = props.edges.some(e => e.avg_duration_sec != null)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-medium">Process model (DFG)</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            {mode === 'frequency'
              ? 'Groen = start · Rood = einde · Dikte pijl = frequentie'
              : 'Groen = snel · Rood = traag · Dikte pijl = relatieve duur'}
          </p>
        </div>

        {hasPerfData && (
          <div
            data-testid="dfg-mode-toggle"
            className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <button
              data-testid="dfg-toggle-frequency"
              onClick={() => setMode('frequency')}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: mode === 'frequency' ? 'rgba(74,158,255,0.2)' : 'transparent',
                color: mode === 'frequency' ? '#4a9eff' : '#94a3b8',
              }}
            >
              Frequentie
            </button>
            <button
              data-testid="dfg-toggle-performance"
              onClick={() => setMode('performance')}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: mode === 'performance' ? 'rgba(239,68,68,0.2)' : 'transparent',
                color: mode === 'performance' ? '#ef4444' : '#94a3b8',
              }}
            >
              Doorlooptijd
            </button>
          </div>
        )}
      </div>

      <DfgGraph {...props} mode={mode} />
    </div>
  )
}
