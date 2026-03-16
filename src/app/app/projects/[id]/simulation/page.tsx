'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine,
} from 'recharts'
import Link from 'next/link'

interface SimulationResult {
  n_simulations: number
  avg_duration_sec: number
  p25_duration_sec: number
  p50_duration_sec: number
  p75_duration_sec: number
  p95_duration_sec: number
  histogram: Array<{ bucket_label: string; count: number }>
}

function durLabel(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}u`
  return `${(sec / 86400).toFixed(1)}d`
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-gray-400 text-sm mt-1">{label}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

function PercentileBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span style={{ color }}>{durLabel(value)}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [sim, setSim] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: job } = await supabase
        .from('mining_jobs')
        .select('result')
        .eq('id', id)
        .single()

      if (job?.result?.simulation && Object.keys(job.result.simulation).length > 0) {
        setSim(job.result.simulation)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const p50BucketIdx = sim
    ? Math.round((sim.p50_duration_sec / (sim.p95_duration_sec || 1)) * (sim.histogram.length - 1))
    : -1

  return (
    <div data-testid="simulation-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Monte Carlo Simulatie
          </h1>
          {sim && (
            <p className="text-gray-400 text-sm mt-1">
              {sim.n_simulations} gesimuleerde cases op basis van historisch procesmodel
            </p>
          )}
        </div>
        <Link href={`/app/projects/${id}`} className="text-sm text-gray-400 hover:text-white">
          ← Terug naar project
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Laden...</p>
      ) : !sim ? (
        <div className="rounded-xl p-8 text-center" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-gray-400 mb-2">Geen simulatiedata beschikbaar.</p>
          <p className="text-gray-600 text-sm">
            Analyseer het log opnieuw om een Monte Carlo simulatie uit te voeren.
            Simulatie vereist duurdata in het event log.
          </p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* KPI grid */}
          <div data-testid="simulation-kpis" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Gemiddeld" value={durLabel(sim.avg_duration_sec)} />
            <KpiCard label="Mediaan (p50)" value={durLabel(sim.p50_duration_sec)} sub="50% van cases korter" />
            <KpiCard label="p75" value={durLabel(sim.p75_duration_sec)} sub="75% van cases korter" />
            <KpiCard label="p95" value={durLabel(sim.p95_duration_sec)} sub="95% van cases korter" />
          </div>

          {/* Histogram */}
          {sim.histogram.length > 0 && (
            <div
              data-testid="simulation-histogram"
              className="rounded-xl p-6"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-white font-medium mb-2">Verwachte doorlooptijdverdeling</h2>
              <p className="text-gray-500 text-xs mb-6">
                Gesimuleerde verdeling op basis van DFG-overgangskansen en historische duurstatistieken
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sim.histogram} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
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
                    formatter={(value) => [value, 'Gesimuleerde cases']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {sim.histogram.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === p50BucketIdx
                          ? 'rgba(34,197,94,0.7)'
                          : `rgba(74,158,255,${0.3 + (i / sim.histogram.length) * 0.5})`}
                      />
                    ))}
                  </Bar>
                  <ReferenceLine
                    x={sim.histogram[p50BucketIdx]?.bucket_label}
                    stroke="rgba(34,197,94,0.5)"
                    strokeDasharray="4 2"
                    label={{ value: 'p50', fill: '#34d399', fontSize: 10 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Percentielbalken */}
          <div
            className="rounded-xl p-6"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-white font-medium mb-6">Percentielen</h2>
            <div className="space-y-4">
              <PercentileBar label="p25 — snelste kwart" value={sim.p25_duration_sec} max={sim.p95_duration_sec} color="#34d399" />
              <PercentileBar label="p50 — mediaan" value={sim.p50_duration_sec} max={sim.p95_duration_sec} color="#4a9eff" />
              <PercentileBar label="p75" value={sim.p75_duration_sec} max={sim.p95_duration_sec} color="#f59e0b" />
              <PercentileBar label="p95 — langzaamste 5%" value={sim.p95_duration_sec} max={sim.p95_duration_sec} color="#ef4444" />
            </div>
          </div>

          {/* Uitleg */}
          <div
            className="rounded-xl p-5"
            style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(74,158,255,0.04)' }}
          >
            <h3 className="text-white text-sm font-medium mb-2">Hoe werkt dit?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              De simulatie gebruikt het ontdekte DFG-procesmodel om {sim.n_simulations} hypothetische cases te simuleren.
              Per overgang worden kansen berekend op basis van historische frequenties, en doorlooptijden
              worden gesampleld uit een normaalverdeling rondom de historische gemiddelden.
              Dit geeft een schatting van hoe toekomstige cases zich zullen gedragen als het proces gelijk blijft.
            </p>
          </div>

        </div>
      )}
    </div>
  )
}
