'use client'

import { ArrowRight } from 'lucide-react'

interface TraceVariant {
  variant_id: number
  activities: string[]
  case_count: number
  percentage: number
  avg_duration_sec: number | null
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}u`
  return `${(sec / 86400).toFixed(1)}d`
}

export function VariantenTab({ result }: { result: Record<string, unknown> }) {
  const varianten = (result.trace_variants as TraceVariant[] | undefined) ?? []

  if (varianten.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">Geen variantendata beschikbaar.</p>
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Top {varianten.length} meest voorkomende procesvarianten, gesorteerd op frequentie.
      </p>
      <div data-testid="varianten-table" className="space-y-2">
        {varianten.map((v) => (
          <div
            data-testid="variant-row"
            key={v.variant_id}
            className="rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Pad */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1">
                  {v.activities.map((act, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium truncate max-w-[160px]" title={act}>
                        {act}
                      </span>
                      {i < v.activities.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-gray-300 shrink-0" />
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="shrink-0 flex flex-col items-end gap-1 text-right">
                <span className="text-sm font-semibold text-gray-800">
                  {v.case_count.toLocaleString('nl-NL')} cases
                </span>
                <span className="text-xs text-gray-400">{v.percentage}%</span>
                {v.avg_duration_sec !== null && (
                  <span className="text-xs font-medium" style={{ color: 'var(--retro-teal)' }}>
                    ⌀ {formatDuration(v.avg_duration_sec)}
                  </span>
                )}
              </div>
            </div>

            {/* Frequentie-balk */}
            <div className="mt-3 h-1 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${v.percentage}%`, background: 'var(--retro-teal)', opacity: 0.6 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
