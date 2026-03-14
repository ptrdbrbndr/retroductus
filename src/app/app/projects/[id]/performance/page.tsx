'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface PerformanceItem {
  activity: string
  avg_duration_sec: number
  case_count: number
}

interface MiningJob {
  id: string
  filename: string | null
  status: string
  result: {
    performance: PerformanceItem[]
    dfg_nodes: { activity: string; count: number; avg_duration_sec: number | null }[]
  } | null
}

function formatDurationLabel(sec: number): string {
  if (sec < 60) return `${sec.toFixed(0)}s`
  if (sec < 3600) return `${(sec / 60).toFixed(1)}m`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}u`
  return `${(sec / 86400).toFixed(1)}d`
}

export default function PerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const [job, setJob] = useState<MiningJob | null>(null)
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setId(p.id))
  }, [params])

  useEffect(() => {
    if (!id) return
    const sb = createClient()
    sb.from('mining_jobs').select('id, filename, status, result').eq('id', id).single()
      .then(({ data }) => setJob(data as MiningJob | null))
  }, [id])

  if (!job) {
    return (
      <div data-testid="performance-loading" className="text-center py-20">
        <div style={{ color: 'rgba(255,255,255,0.4)' }}>Laden...</div>
      </div>
    )
  }

  const performance = job.result?.performance ?? []
  const sortedByDuration = [...performance].sort((a, b) => b.avg_duration_sec - a.avg_duration_sec)
  const top10 = sortedByDuration.slice(0, 10)

  const chartData = top10.map(p => ({
    name: p.activity.length > 20 ? p.activity.slice(0, 18) + '…' : p.activity,
    fullName: p.activity,
    duur: Math.round(p.avg_duration_sec),
    cases: p.case_count,
  }))

  return (
    <div data-testid="performance-page">
      {/* Header */}
      <div className="mb-8">
        <a href={`/app/projects/${id}`} data-testid="back-to-discovery"
          className="text-sm" style={{ color: 'var(--retro-teal)' }}>
          ← Terug naar discovery
        </a>
        <h1 className="text-2xl font-semibold text-white mt-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Performance — {job.filename || `Analyse ${id?.slice(0, 8)}`}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Gemiddelde doorlooptijden per activiteit
        </p>
      </div>

      {performance.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ border: '1px dashed rgba(255,255,255,0.15)' }}
          data-testid="no-performance-data">
          <div className="text-3xl mb-3">⚠️</div>
          <div className="text-white">Geen doorlooptijddata beschikbaar</div>
          <div className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Voeg een <code>duration_ms</code> kolom toe aan je CSV om performance te analyseren.
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Bar chart — top bottlenecks */}
          <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="bottleneck-chart">
            <h2 className="text-base font-semibold text-white mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Top bottlenecks — gemiddelde doorlooptijd
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  tickFormatter={formatDurationLabel}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                  width={130}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#0B1D3A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: 'white', fontWeight: 600 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, _name: any, item: any) => [
                    formatDurationLabel(Number(value)),
                    `Gem. duur — ${item?.payload?.cases ?? ''} cases`,
                  ]}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? ''}
                />
                <Bar dataKey="duur" fill="#2EC4B6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bottleneck tabel */}
          <div data-testid="bottleneck-table">
            <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Alle activiteiten
            </h2>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                    <th className="px-5 py-3 text-left font-medium">#</th>
                    <th className="px-5 py-3 text-left font-medium">Activiteit</th>
                    <th className="px-5 py-3 text-right font-medium">Gem. duur</th>
                    <th className="px-5 py-3 text-right font-medium">Cases</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByDuration.map((item, i) => (
                    <tr key={i} data-testid={`perf-row-${i}`}
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)' }}>
                      <td className="px-5 py-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</td>
                      <td className="px-5 py-3">{item.activity}</td>
                      <td className="px-5 py-3 text-right font-medium" style={{ color: i < 3 ? '#ef4444' : 'var(--retro-teal)' }}>
                        {formatDurationLabel(item.avg_duration_sec)}
                      </td>
                      <td className="px-5 py-3 text-right" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {item.case_count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
