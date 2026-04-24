'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef } from 'react'

interface ConformanceResult {
  fitness: number | null
  precision: number | null
  f1_score: number | null
  log_activity_count: number
  model_activity_count: number
  matching_count: number
  deviations: Array<{ activity: string; type: string; description: string }>
  log_activities: string[]
  model_activities: string[]
  error?: string
}

function FitnessGauge({ value, label }: { value: number | null; label: string }) {
  if (value === null) return null
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="rounded-xl p-5 text-center" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
      <div className="relative w-24 h-24 mx-auto mb-3">
        <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{pct}%</span>
        </div>
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  )
}

export default function ConformancePage() {
  const { id } = useParams<{ id: string }>()
  const [result, setResult] = useState<ConformanceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bpmnFile, setBpmnFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function runCheck() {
    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('job_id', id)
    if (bpmnFile) formData.append('bpmn_file', bpmnFile)

    try {
      const res = await fetch('/api/conformance', { method: 'POST', body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.detail || data.error || `Fout ${res.status}`)
      } else {
        setResult(data)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="conformance-page">
      <div className="mb-8">
        <Link href={`/app/projects/${id}`} className="text-sm text-gray-400 hover:text-white mb-2 block">
          ← Terug naar project
        </Link>
        <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Conformance Checking
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Vergelijk het geobserveerde proces met een normatief model
        </p>
      </div>

      {/* BPMN upload */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
      >
        <h2 className="text-white font-medium mb-4">Normatief model (optioneel)</h2>
        <p className="text-gray-400 text-sm mb-4">
          Upload een BPMN XML-bestand om de log tegen te checken. Zonder bestand wordt het geobserveerde DFG als referentie gebruikt.
        </p>
        <div className="flex items-center gap-4">
          <button
            data-testid="bpmn-upload-btn"
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {bpmnFile ? bpmnFile.name : 'BPMN XML kiezen'}
          </button>
          <input
            ref={fileRef}
            data-testid="bpmn-input"
            type="file"
            accept=".bpmn,.xml"
            className="hidden"
            onChange={e => setBpmnFile(e.target.files?.[0] || null)}
          />
          {bpmnFile && (
            <button
              onClick={() => { setBpmnFile(null); if (fileRef.current) fileRef.current.value = '' }}
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              × verwijderen
            </button>
          )}
        </div>
      </div>

      <button
        data-testid="run-conformance"
        onClick={runCheck}
        disabled={loading}
        className="w-full py-3 rounded-lg text-white font-medium text-sm disabled:opacity-50 mb-6"
        style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)' }}
      >
        {loading ? 'Bezig met analyseren...' : 'Voer conformance check uit'}
      </button>

      {error && (
        <div
          data-testid="conformance-error"
          className="rounded-xl p-5 mb-6"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div data-testid="conformance-result" className="space-y-6">
          {result.error ? (
            <div className="rounded-xl p-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-red-400 text-sm">{result.error}</p>
            </div>
          ) : (
            <>
              {/* Gauges */}
              <div className="grid grid-cols-3 gap-4">
                <FitnessGauge value={result.fitness} label="Fitness" />
                <FitnessGauge value={result.precision} label="Precisie" />
                <FitnessGauge value={result.f1_score} label="F1-score" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Log activiteiten', value: result.log_activity_count },
                  { label: 'Model activiteiten', value: result.model_activity_count },
                  { label: 'Overeenkomend', value: result.matching_count },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-5 text-center" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-2xl font-semibold text-white">{s.value}</p>
                    <p className="text-gray-400 text-sm mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Afwijkingen */}
              {result.deviations.length > 0 && (
                <div data-testid="conformance-deviations" className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <h2 className="text-white font-medium">Afwijkingen ({result.deviations.length})</h2>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {result.deviations.map((d, i) => (
                      <div key={i} className="px-5 py-3 flex items-start gap-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0"
                          style={{
                            background: d.type === 'log_only' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                            color: d.type === 'log_only' ? '#fca5a5' : '#fcd34d',
                          }}
                        >
                          {d.type === 'log_only' ? 'alleen in log' : 'alleen in model'}
                        </span>
                        <p className="text-gray-300 text-sm">{d.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.deviations.length === 0 && (
                <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <p className="text-green-400 font-medium">Perfecte conformance — geen afwijkingen gevonden</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
