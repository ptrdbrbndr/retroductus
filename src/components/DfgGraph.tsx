'use client'

import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export interface DfgNode {
  activity: string
  count: number
  avg_duration_sec?: number | null
}

export interface DfgEdge {
  from?: string
  source?: string
  to?: string
  target?: string
  count: number
  avg_duration_sec?: number | null
}

export type DfgMode = 'frequency' | 'performance'

interface Props {
  nodes: DfgNode[]
  edges: DfgEdge[]
  startActivities: Record<string, number>
  endActivities: Record<string, number>
  mode?: DfgMode
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 60

function durLabel(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}u`
  return `${(sec / 86400).toFixed(1)}d`
}

function buildLayout(
  dfgNodes: DfgNode[],
  dfgEdges: DfgEdge[],
  startActs: Record<string, number>,
  endActs: Record<string, number>,
  mode: DfgMode,
): { nodes: Node[]; edges: Edge[] } {
  const actNames = dfgNodes.map(n => n.activity)
  const edgeMap: Record<string, string[]> = {}
  dfgEdges.forEach(e => {
    const src = e.from ?? e.source ?? ''
    const tgt = e.to ?? e.target ?? ''
    if (!edgeMap[src]) edgeMap[src] = []
    edgeMap[src].push(tgt)
  })

  // BFS layering
  const layers: string[][] = []
  const visited = new Set<string>()
  const queue: Array<{ name: string; depth: number }> = []
  const starts = Object.keys(startActs).length > 0 ? Object.keys(startActs) : actNames.slice(0, 1)
  starts.forEach(s => {
    if (actNames.includes(s)) {
      queue.push({ name: s, depth: 0 })
      visited.add(s)
    }
  })
  while (queue.length > 0) {
    const { name, depth } = queue.shift()!
    if (!layers[depth]) layers[depth] = []
    layers[depth].push(name)
    ;(edgeMap[name] || []).forEach(next => {
      if (!visited.has(next) && actNames.includes(next)) {
        visited.add(next)
        queue.push({ name: next, depth: depth + 1 })
      }
    })
  }
  const unvisited = actNames.filter(n => !visited.has(n))
  if (unvisited.length > 0) layers.push(unvisited)

  const maxPerCol = Math.max(...layers.map(l => l.length), 1)

  const flowNodes: Node[] = []
  layers.forEach((layer, col) => {
    layer.forEach((name, row) => {
      const dfgNode = dfgNodes.find(n => n.activity === name)
      const isStart = name in startActs
      const isEnd = name in endActs
      flowNodes.push({
        id: name,
        position: {
          x: col * (NODE_WIDTH + 80),
          y: row * (NODE_HEIGHT + 40) - ((layer.length - 1) * (NODE_HEIGHT + 40)) / 2 + (maxPerCol * (NODE_HEIGHT + 40)) / 2,
        },
        data: {
          label: (
            <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: '#e2e8f0' }}>{name}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                {mode === 'performance' && dfgNode?.avg_duration_sec != null
                  ? durLabel(dfgNode.avg_duration_sec)
                  : `${dfgNode?.count ?? 0}×`}
              </div>
            </div>
          ),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background: isStart
            ? 'rgba(34,197,94,0.15)'
            : isEnd
            ? 'rgba(239,68,68,0.15)'
            : 'rgba(255,255,255,0.06)',
          border: `1px solid ${isStart ? 'rgba(34,197,94,0.5)' : isEnd ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 10,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
        },
      })
    })
  })

  // Edge rendering: frequency vs performance mode
  const perfEdges = dfgEdges.filter(e => e.avg_duration_sec != null)
  const maxCount = Math.max(...dfgEdges.map(e => e.count), 1)
  const maxDur = perfEdges.length > 0
    ? Math.max(...perfEdges.map(e => e.avg_duration_sec!), 1)
    : 1

  const flowEdges: Edge[] = dfgEdges.map((e, i) => {
    const src = e.from ?? e.source ?? ''
    const tgt = e.to ?? e.target ?? ''

    if (mode === 'performance' && e.avg_duration_sec != null) {
      const weight = e.avg_duration_sec / maxDur
      // Red = slow, green = fast (inverted: high duration = red)
      const r = Math.round(239 * weight + 34 * (1 - weight))
      const g = Math.round(68 * weight + 197 * (1 - weight))
      const b = Math.round(68 * weight + 94 * (1 - weight))
      const color = `rgb(${r},${g},${b})`
      return {
        id: `e-${i}`,
        source: src,
        target: tgt,
        label: durLabel(e.avg_duration_sec),
        labelStyle: { fill: '#e2e8f0', fontSize: 10 },
        labelBgStyle: { fill: 'transparent' },
        style: { stroke: color, strokeWidth: 1 + weight * 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
        animated: weight > 0.7,
      }
    }

    // Frequency mode (default)
    const weight = e.count / maxCount
    return {
      id: `e-${i}`,
      source: src,
      target: tgt,
      label: String(e.count),
      labelStyle: { fill: '#94a3b8', fontSize: 10 },
      labelBgStyle: { fill: 'transparent' },
      style: {
        stroke: `rgba(74,158,255,${0.2 + weight * 0.8})`,
        strokeWidth: 1 + weight * 3,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: `rgba(74,158,255,${0.4 + weight * 0.6})` },
      animated: weight > 0.7,
    }
  })

  return { nodes: flowNodes, edges: flowEdges }
}

export default function DfgGraph({ nodes: dfgNodes, edges: dfgEdges, startActivities, endActivities, mode = 'frequency' }: Props) {
  const { nodes, edges } = useMemo(
    () => buildLayout(dfgNodes, dfgEdges, startActivities, endActivities, mode),
    [dfgNodes, dfgEdges, startActivities, endActivities, mode],
  )

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Geen activiteiten om te tonen.
      </div>
    )
  }

  return (
    <div data-testid="dfg-graph" style={{ width: '100%', height: 480, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <Background color="rgba(255,255,255,0.05)" gap={24} />
        <Controls
          style={{ background: 'rgba(15,30,53,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          showInteractive={false}
        />
        <MiniMap
          style={{ background: 'rgba(15,30,53,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          nodeColor="rgba(74,158,255,0.4)"
          maskColor="rgba(0,0,0,0.4)"
        />
      </ReactFlow>
    </div>
  )
}
