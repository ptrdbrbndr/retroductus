'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import Link from 'next/link'

interface CaseDurations {
  histogram: Array<{ bucket_label: string; count: number }>
  avg_sec: number
  p25_sec: number
  p50_sec: number
  p75_sec: number
  p95_sec: number
  min_sec: number
  max_sec: number
  case_count: number
}

interface HeatmapEntry {
  activity: string
  hour: number
  count: number
}

function durLabel(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}u`
  return `${(sec / 86400).toFixed(1)}d`
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-gray-400 text-xs mt-1">{label}</p>
    </div>
  )
}

function ActivityHeatmap({ data }: { data: HeatmapEntry[] }) {
  if (data.length === 0) return null

  const activities = [...new Set(data.map(d => d.activity))].sort()
  const maxCount = Math.max(...data.map(d => d.count), 1)

  // Build lookup: activity -> hour -> count
  const lookup: Record<string, Record<number, number>> = {}
  data.forEach(d => {
    if (!lookup[d.activity]) lookup[d.activity] = {}
    lookup[d.activity][d.hour] = d.count
  })

  const CELL_W = 24
  const CELL_H = 22
  const LABEL_W = 160
  const HEADER_H = 28
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="overflow-x-auto">
      <svg
        width={LABEL_W + 24 * CELL_W + 8}
        height={HEADER_H + activities.length * CELL_H + 8}
        style={{ display: 'block' }}
      >
        {/* Hour labels */}
        {hours.map(h => (
          <text
            key={h}
            x={LABEL_W + h * CELL_W + CELL_W / 2}
            y={HEADER_H - 6}
            textAnchor="middle"
            fontSize={9}
            fill="#6b7280"
          >
            {h % 3 === 0 ? `${h}u` : ''}
          </text>
        ))}

        {activities.map((act, ai) => (
          <g key={act}>
            {/* Activity label */}
            <text
              x={LABEL_W - 6}
              y={HEADER_H + ai * CELL_H + CELL_H / 2 + 4}
              textAnchor="end"
              fontSize={10}
              fill="#9ca3af"
            >
              {act.length > 20 ? act.slice(0, 18) + '…' : act}
            </text>

            {hours.map(h => {
              const count = lookup[act]?.[h] ?? 0
              const intensity = count / maxCount
              const alpha = count === 0 ? 0.04 : 0.15 + intensity * 0.75
              return (
                <g key={h}>
                  <rect
                    x={LABEL_W + h * CELL_W + 1}
                    y={HEADER_H + ai * CELL_H + 1}
                    width={CELL_W - 2}
                    height={CELL_H - 2}
                    rx={3}
                    fill={`rgba(74,158,255,${alpha})`}
                  />
                  {count > 0 && intensity > 0.4 && (
                    <text
                      x={LABEL_W + h * CELL_W + CELL_W / 2}
                      y={HEADER_H + ai * CELL_H + CELL_H / 2 + 4}
                      textAnchor="middle"
                      fontSize={8}
                      fill="rgba(255,255,255,0.8)"
                    >
                      {count}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function StatisticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [caseDurations, setCaseDurations] = useState<CaseDurations | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: job } = await supabase
        .from('mining_jobs')
        .select('result')
        .eq('id', id)
        .single()

      if (job?.result?.case_durations && Object.keys(job.result.case_durations).length > 0) {
        setCaseDurations(job.result.case_durations)
      }
      if (job?.result?.activity_heatmap) {
        setHeatmap(job.result.activity_heatmap)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const hasData = caseDurations || heatmap.length > 0

  return (
    <div data-testid="statistics-page">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Statistieken
        </h1>
        <Link href={`/app/projects/${id}`} className="text-sm text-gray-400 hover:text-white">
          ← Terug naar project
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Laden...</p>
      ) : !hasData ? (
        <p className="text-gray-400">Geen statistiekdata beschikbaar. Analyseer het log opnieuw.</p>
      ) : (
        <div className="space-y-8">

          {/* Case duration */}
          {caseDurations && (
            <>
              <div data-testid="duration-kpis" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard label="Gemiddeld" value={durLabel(caseDurations.avg_sec)} />
                <KpiCard label="Mediaan (p50)" value={durLabel(caseDurations.p50_sec)} />
                <KpiCard label="p75" value={durLabel(caseDurations.p75_sec)} />
                <KpiCard label="p95" value={durLabel(caseDurations.p95_sec)} />
              </div>

              <div
                data-testid="duration-histogram"
                className="rounded-xl p-6"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <h2 className="text-white font-medium mb-6">Verdeling doorlooptijd per case</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={caseDurations.histogram} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="bucket_label"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={48}
                    />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: '#0f1e35', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e2e8f0' }}
                      formatter={(value) => [value, 'Cases']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {caseDurations.histogram.map((_, i) => (
                        <Cell
                          key={i}
                          fill={`rgba(74,158,255,${0.4 + (i / caseDurations.histogram.length) * 0.5})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-4 text-xs text-gray-500">
                  <span>Min: {durLabel(caseDurations.min_sec)}</span>
                  <span>Max: {durLabel(caseDurations.max_sec)}</span>
                  <span>Cases: {caseDurations.case_count}</span>
                </div>
              </div>
            </>
          )}

          {/* Activity heatmap */}
          {heatmap.length > 0 && (
            <div
              data-testid="activity-heatmap"
              className="rounded-xl p-6"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-white font-medium mb-2">Activiteit heatmap — uur van de dag</h2>
              <p className="text-gray-500 text-xs mb-6">Intensiteit = aantal events · donkerder = meer activiteit</p>
              <ActivityHeatmap data={heatmap} />
            </div>
          )}

        </div>
      )}
    </div>
  )
}
