'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface TraceVariant {
  variant_id: number
  activities: string[]
  case_count: number
  percentage: number
  avg_duration_sec: number | null
}

function durLabel(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}u`
  return `${(sec / 86400).toFixed(1)}d`
}

function VariantRow({ variant, maxCount }: { variant: TraceVariant; maxCount: number }) {
  const [expanded, setExpanded] = useState(false)
  const barWidth = maxCount > 0 ? (variant.case_count / maxCount) * 100 : 0

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
    >
      <button
        data-testid={`variant-row-${variant.variant_id}`}
        onClick={() => setExpanded(e => !e)}
        className="w-full px-5 py-4 text-left"
        aria-label={`Variant ${variant.variant_id + 1} details tonen`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-6">#{variant.variant_id + 1}</span>
            <span className="text-white text-sm font-medium">{variant.case_count} cases</span>
            <span className="text-gray-500 text-xs">{variant.percentage}%</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {variant.avg_duration_sec != null && (
              <span className="text-gray-400">{durLabel(variant.avg_duration_sec)}</span>
            )}
            <span className="text-gray-600">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Frequentiebalk */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${barWidth}%`, background: 'rgba(74,158,255,0.6)' }}
          />
        </div>

        {/* Activiteitenstroom (altijd zichtbaar, verkort) */}
        <div className="flex flex-wrap items-center gap-1 mt-3">
          {variant.activities.slice(0, expanded ? undefined : 5).map((act, i) => (
            <span key={i} className="flex items-center gap-1">
              <span
                className="px-2 py-0.5 rounded text-xs"
                style={{ background: 'rgba(74,158,255,0.1)', color: '#4a9eff' }}
              >
                {act}
              </span>
              {i < (expanded ? variant.activities.length : Math.min(4, variant.activities.length)) - 1 && (
                <span className="text-gray-600 text-xs">→</span>
              )}
            </span>
          ))}
          {!expanded && variant.activities.length > 5 && (
            <span className="text-gray-500 text-xs">+{variant.activities.length - 5} meer</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="pt-3 space-y-2 text-sm text-gray-400">
            <p><span className="text-gray-500">Stappen:</span> {variant.activities.length}</p>
            {variant.avg_duration_sec != null && (
              <p><span className="text-gray-500">Gem. doorlooptijd:</span> {durLabel(variant.avg_duration_sec)}</p>
            )}
            <div className="flex flex-wrap items-center gap-1 mt-2">
              {variant.activities.map((act, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ background: 'rgba(74,158,255,0.12)', color: '#7db8ff' }}
                  >
                    {act}
                  </span>
                  {i < variant.activities.length - 1 && (
                    <span className="text-gray-600 text-xs">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function VariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [variants, setVariants] = useState<TraceVariant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: job } = await supabase
        .from('mining_jobs')
        .select('result')
        .eq('id', id)
        .single()

      if (job?.result?.trace_variants) {
        setVariants(job.result.trace_variants)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const maxCount = variants.length > 0 ? Math.max(...variants.map(v => v.case_count)) : 1
  const totalCases = variants.reduce((s, v) => s + v.case_count, 0)

  return (
    <div data-testid="variants-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Procesvarianten
          </h1>
          {!loading && variants.length > 0 && (
            <p className="text-gray-400 text-sm mt-1">
              {variants.length} varianten · {totalCases} cases
            </p>
          )}
        </div>
        <Link href={`/app/projects/${id}`} className="text-sm text-gray-400 hover:text-white">
          ← Terug naar project
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Laden...</p>
      ) : variants.length === 0 ? (
        <p className="text-gray-400">Geen variantdata beschikbaar. Analyseer het log opnieuw om varianten te berekenen.</p>
      ) : (
        <div className="space-y-3">
          {variants.map(v => (
            <VariantRow key={v.variant_id} variant={v} maxCount={maxCount} />
          ))}
        </div>
      )}
    </div>
  )
}
