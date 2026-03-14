'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Link from 'next/link'

interface Bottleneck {
  activity: string
  avg_duration: number
  count: number
}

export default function PerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: job } = await supabase
        .from('mining_jobs')
        .select('result')
        .eq('id', id)
        .single()

      if (job?.result?.dfg_edges) {
        const edgesWithDuration = job.result.dfg_edges
          .filter((e: any) => e.avg_duration != null && e.avg_duration > 0)
          .map((e: any) => ({
            activity: `${e.source} → ${e.target}`,
            avg_duration: Math.round(e.avg_duration / 3600), // seconds to hours
            count: e.count,
          }))
          .sort((a: Bottleneck, b: Bottleneck) => b.avg_duration - a.avg_duration)
        setBottlenecks(edgesWithDuration)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const top10 = bottlenecks.slice(0, 10)

  return (
    <div data-testid="performance-page">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Bottleneck analyse
        </h1>
        <Link href={`/app/projects/${id}`} className="text-sm text-gray-400 hover:text-white">
          ← Terug naar project
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Laden...</p>
      ) : bottlenecks.length === 0 ? (
        <p className="text-gray-400">Geen duurdata beschikbaar in dit logbestand.</p>
      ) : (
        <div className="space-y-8">
          <div data-testid="bottleneck-chart" className="rounded-xl p-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-white font-medium mb-6">Top 10 langste overgangen (uur)</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={top10} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis dataKey="activity" type="category" width={200} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0f1e35', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e2e8f0' }}
                  formatter={(value: any) => [`${value} uur`, 'Gem. duur']}
                />
                <Bar dataKey="avg_duration" radius={[0, 4, 4, 0]}>
                  {top10.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#ef4444' : i < 3 ? '#f59e0b' : '#4a9eff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div data-testid="bottleneck-table" className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <h2 className="text-white font-medium">Alle overgangen gesorteerd op duur</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-5 py-3">Overgang</th>
                  <th className="px-5 py-3 text-right">Gem. duur (uur)</th>
                  <th className="px-5 py-3 text-right">Aantal</th>
                </tr>
              </thead>
              <tbody>
                {bottlenecks.map((b, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-5 py-3 text-gray-300">{b.activity}</td>
                    <td className="px-5 py-3 text-right text-white">{b.avg_duration}</td>
                    <td className="px-5 py-3 text-right text-gray-400">{b.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
