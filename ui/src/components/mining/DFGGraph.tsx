'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface DFGNode { activity: string; count: number; avg_duration_sec: number | null }
interface DFGEdge { from: string; to: string; count: number; avg_duration_sec: number | null }

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}u`
  return `${(sec / 86400).toFixed(1)}d`
}

function durationColor(sec: number | null): string {
  if (sec === null) return '#94a3b8'
  if (sec < 300)    return '#2EC4B6'   // < 5 min: teal
  if (sec < 3600)   return '#f59e0b'   // < 1 uur: amber
  if (sec < 86400)  return '#f97316'   // < 1 dag: oranje
  return '#ef4444'                      // > 1 dag: rood
}

function buildLayout(nodes: DFGNode[]): Map<string, { x: number; y: number }> {
  // Simpele grid-layout: 4 kolommen, rijen omlaag
  const positions = new Map<string, { x: number; y: number }>()
  const cols = Math.min(4, nodes.length)
  nodes.forEach((n, i) => {
    positions.set(n.activity, {
      x: (i % cols) * 240,
      y: Math.floor(i / cols) * 130,
    })
  })
  return positions
}

export function DFGGraph({ result }: { result: Record<string, unknown> }) {
  const dfgNodes = (result.dfg_nodes as DFGNode[] | undefined) ?? []
  const dfgEdges = (result.dfg_edges as DFGEdge[] | undefined) ?? []
  const startActs = (result.start_activities as Record<string, number> | undefined) ?? {}
  const endActs   = (result.end_activities   as Record<string, number> | undefined) ?? {}

  const positions = useMemo(() => buildLayout(dfgNodes), [dfgNodes])
  const maxCount  = useMemo(() => Math.max(...dfgEdges.map(e => e.count), 1), [dfgEdges])

  const rfNodes: Node[] = useMemo(() =>
    dfgNodes.map(n => ({
      id: n.activity,
      position: positions.get(n.activity) ?? { x: 0, y: 0 },
      data: {
        label: (
          <div className="text-center leading-tight">
            <div className="font-medium text-gray-800 text-xs truncate max-w-[150px]">{n.activity}</div>
            <div className="text-gray-400 text-xs">{n.count.toLocaleString('nl-NL')}×</div>
            {n.avg_duration_sec !== null && (
              <div className="text-xs mt-0.5" style={{ color: durationColor(n.avg_duration_sec) }}>
                ⌀ {formatDuration(n.avg_duration_sec)}
              </div>
            )}
          </div>
        ),
      },
      style: {
        background: startActs[n.activity]
          ? '#d1fae5'
          : endActs[n.activity]
          ? '#fee2e2'
          : '#fff',
        border: `1px solid ${startActs[n.activity] ? '#6ee7b7' : endActs[n.activity] ? '#fca5a5' : '#e5e7eb'}`,
        borderRadius: 10,
        padding: '8px 12px',
        minWidth: 140,
        maxWidth: 180,
        fontSize: 12,
      },
    })),
    [dfgNodes, positions, startActs, endActs]
  )

  const rfEdges: Edge[] = useMemo(() =>
    dfgEdges.map(e => ({
      id: `${e.from}__${e.to}`,
      source: e.from,
      target: e.to,
      label: e.avg_duration_sec !== null
        ? formatDuration(e.avg_duration_sec)
        : e.count.toLocaleString('nl-NL'),
      labelStyle: { fontSize: 10, fill: '#6b7280' },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
      style: {
        strokeWidth: Math.max(1.5, (e.count / maxCount) * 7),
        stroke: durationColor(e.avg_duration_sec),
      },
      markerEnd: { type: 'arrowclosed' as const },
    })),
    [dfgEdges, maxCount]
  )

  const [nodes, , onNodesChange] = useNodesState(rfNodes)
  const [edges, , onEdgesChange] = useEdgesState(rfEdges)

  const onInit = useCallback((instance: { fitView: () => void }) => {
    instance.fitView()
  }, [])

  if (dfgNodes.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">Geen procesmodel beschikbaar.</p>
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" /> Startactiviteit</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> Eindactiviteit</span>
        <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-teal-400 inline-block" /> Snel</span>
        <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-red-400 inline-block" /> Langzaam</span>
      </div>

      <div data-testid="dfg-canvas" style={{ height: 520, borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onInit}
          fitView
        >
          <Background color="#f5f5f5" gap={20} />
          <Controls data-testid="dfg-controls" />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>
    </div>
  )
}
