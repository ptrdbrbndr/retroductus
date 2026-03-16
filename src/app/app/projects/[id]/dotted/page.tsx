'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import Link from 'next/link'

interface DotEvent {
  case_id: string
  activity: string
  timestamp: string
}

// Vaste kleurpalet voor activiteiten
const PALETTE = [
  '#4a9eff', '#f59e0b', '#34d399', '#f472b6', '#a78bfa',
  '#fb7185', '#38bdf8', '#facc15', '#4ade80', '#c084fc',
  '#f97316', '#22d3ee', '#e879f9', '#86efac', '#fbbf24',
]

function activityColor(activity: string, allActivities: string[]): string {
  const idx = allActivities.indexOf(activity)
  return PALETTE[idx % PALETTE.length]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{
      background: '#0f1e35',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <p style={{ color: '#e2e8f0', fontWeight: 600 }}>{d.activity}</p>
      <p style={{ color: '#94a3b8' }}>Case: {d.caseId}</p>
      <p style={{ color: '#94a3b8' }}>{new Date(d.rawTs).toLocaleString('nl-NL')}</p>
    </div>
  )
}

export default function DottedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [events, setEvents] = useState<DotEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filterActivity, setFilterActivity] = useState<string>('alle')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: job } = await supabase
        .from('mining_jobs')
        .select('result')
        .eq('id', id)
        .single()

      if (job?.result?.dotted_chart) {
        setEvents(job.result.dotted_chart)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const allActivities = useMemo(
    () => [...new Set(events.map(e => e.activity))].sort(),
    [events],
  )

  const chartData = useMemo(() => {
    const cases = [...new Set(events.map(e => e.case_id))].sort()
    const caseIndex: Record<string, number> = {}
    cases.forEach((c, i) => { caseIndex[c] = i })

    return events
      .filter(e => filterActivity === 'alle' || e.activity === filterActivity)
      .map(e => ({
        x: new Date(e.timestamp).getTime(),
        y: caseIndex[e.case_id] ?? 0,
        activity: e.activity,
        caseId: e.case_id,
        rawTs: e.timestamp,
      }))
  }, [events, filterActivity])

  const minTs = chartData.length > 0 ? Math.min(...chartData.map(d => d.x)) : 0
  const maxTs = chartData.length > 0 ? Math.max(...chartData.map(d => d.x)) : 0

  return (
    <div data-testid="dotted-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Dotted Chart
          </h1>
          {!loading && events.length > 0 && (
            <p className="text-gray-400 text-sm mt-1">
              {events.length} events · {new Set(events.map(e => e.case_id)).size} cases
            </p>
          )}
        </div>
        <Link href={`/app/projects/${id}`} className="text-sm text-gray-400 hover:text-white">
          ← Terug naar project
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Laden...</p>
      ) : events.length === 0 ? (
        <p className="text-gray-400">Geen tijdlijndata beschikbaar. Analyseer het log opnieuw.</p>
      ) : (
        <div className="space-y-6">

          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="dotted-filter-alle"
              onClick={() => setFilterActivity('alle')}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: filterActivity === 'alle' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                color: filterActivity === 'alle' ? '#e2e8f0' : '#6b7280',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              aria-label="Toon alle activiteiten"
            >
              Alle activiteiten
            </button>
            {allActivities.map(act => (
              <button
                key={act}
                data-testid={`dotted-filter-${act}`}
                onClick={() => setFilterActivity(act)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: filterActivity === act ? `${activityColor(act, allActivities)}22` : 'rgba(255,255,255,0.04)',
                  color: filterActivity === act ? activityColor(act, allActivities) : '#6b7280',
                  border: `1px solid ${filterActivity === act ? activityColor(act, allActivities) + '44' : 'rgba(255,255,255,0.08)'}`,
                }}
                aria-label={`Filter op activiteit ${act}`}
              >
                {act}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div
            data-testid="dotted-chart"
            className="rounded-xl p-6"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-gray-500 text-xs mb-4">
              X = tijdstip · Y = case (gesorteerd) · kleur = activiteit
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[minTs, maxTs]}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}
                  name="Tijdstip"
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  label={{ value: 'Case', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }}
                  name="Case"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter data={chartData} shape="circle">
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={activityColor(d.activity, allActivities)} fillOpacity={0.75} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda */}
          <div
            className="rounded-xl p-4"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-gray-500 text-xs mb-3">Activiteiten</p>
            <div className="flex flex-wrap gap-3">
              {allActivities.map(act => (
                <div key={act} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: activityColor(act, allActivities) }}
                  />
                  <span className="text-xs text-gray-400">{act}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
