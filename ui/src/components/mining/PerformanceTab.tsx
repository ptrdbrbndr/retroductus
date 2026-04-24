'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ActivityPerf { activity: string; avg_duration_sec: number | null; case_count: number }
interface HistogramBucket { bucket_label: string; count: number }
interface CaseDurations {
  avg_sec?: number; p50_sec?: number; p95_sec?: number; case_count?: number
  histogram?: HistogramBucket[]
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}u`
  return `${(sec / 86400).toFixed(1)}d`
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: 'var(--retro-navy)', fontFamily: 'Cormorant Garamond, serif' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function PerformanceTab({ result }: { result: Record<string, unknown> }) {
  const perf       = (result.performance as ActivityPerf[] | undefined) ?? []
  const caseDur    = (result.case_durations as CaseDurations | undefined) ?? {}
  const histogram  = caseDur.histogram ?? []

  const sorted = [...perf].sort((a, b) => (b.avg_duration_sec ?? 0) - (a.avg_duration_sec ?? 0))
  const maxDur = Math.max(...sorted.map(a => a.avg_duration_sec ?? 0), 1)

  if (perf.length === 0 && !caseDur.case_count) {
    return <p className="text-sm text-gray-400 text-center py-12">Geen performance-data beschikbaar.</p>
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      {caseDur.case_count && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Doorlooptijden</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              data-testid="perf-avg"
              label="Gemiddeld"
              value={caseDur.avg_sec ? formatDuration(caseDur.avg_sec) : '—'}
            />
            <StatCard
              data-testid="perf-p50"
              label="Mediaan (P50)"
              value={caseDur.p50_sec ? formatDuration(caseDur.p50_sec) : '—'}
            />
            <StatCard
              data-testid="perf-p95"
              label="P95"
              value={caseDur.p95_sec ? formatDuration(caseDur.p95_sec) : '—'}
            />
            <StatCard
              label="Cases"
              value={caseDur.case_count.toLocaleString('nl-NL')}
            />
          </div>
        </div>
      )}

      {/* Histogram */}
      {histogram.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Verdeling doorlooptijden</h3>
          <div data-testid="perf-histogram">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={histogram} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <XAxis dataKey="bucket_label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(v) => [v != null ? `${v} cases` : '—', 'Aantal']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {histogram.map((_: HistogramBucket, i: number) => (
                    <Cell key={i} fill="#2EC4B6" fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activiteiten-tabel */}
      {sorted.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Activiteiten — langste doorlooptijd eerst</h3>
          <div data-testid="perf-activity-table" className="rounded-xl overflow-hidden border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left font-medium">Activiteit</th>
                  <th className="px-4 py-2.5 text-right font-medium">Frequentie</th>
                  <th className="px-4 py-2.5 text-right font-medium">Gem. duur</th>
                  <th className="px-4 py-2.5 text-right font-medium w-36">Verhouding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((row) => (
                  <tr key={row.activity} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.activity}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{row.case_count.toLocaleString('nl-NL')}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: row.avg_duration_sec ? '#2EC4B6' : '#9ca3af' }}>
                      {row.avg_duration_sec ? formatDuration(row.avg_duration_sec) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 rounded-full bg-gray-100 flex-1 max-w-[100px]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${((row.avg_duration_sec ?? 0) / maxDur) * 100}%`,
                              background: 'var(--retro-teal)',
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>
                    </td>
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
