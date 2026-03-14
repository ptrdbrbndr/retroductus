'use client'

import dynamic from 'next/dynamic'

const DfgGraph = dynamic(() => import('./DfgGraph'), { ssr: false, loading: () => (
  <div data-testid="dfg-graph-loading" style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
    <p className="text-gray-400 text-sm">Process model laden...</p>
  </div>
) })

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
}

interface Props {
  nodes: DfgNode[]
  edges: DfgEdge[]
  startActivities: Record<string, number>
  endActivities: Record<string, number>
}

export default function DfgSection(props: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-white font-medium">Process model (DFG)</h2>
      <p className="text-gray-500 text-xs">Groen = startactiviteit · Rood = eindactiviteit · Dikte pijl = frequentie</p>
      <DfgGraph {...props} />
    </div>
  )
}
