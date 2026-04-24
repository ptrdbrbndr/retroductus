'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef } from 'react'

export default function InsightsPage() {
  const { id } = useParams<{ id: string }>()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [cached, setCached] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function fetchInsights(forceRefresh = false) {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError('')
    setText('')
    setDone(false)
    setCached(false)

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: id, force_refresh: forceRefresh }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const msg = await res.text()
        setError(msg || `Fout ${res.status}`)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      let buffer = ''
      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6))
            if (payload.text) setText(prev => prev + payload.text)
            if (payload.done) {
              setDone(true)
              setCached(payload.cached || false)
            }
          } catch {}
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="insights-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href={`/app/projects/${id}`}
            className="text-sm text-gray-400 hover:text-white mb-2 block"
          >
            ← Terug naar project
          </Link>
          <h1
            className="text-3xl font-semibold text-white"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            AI Insights
          </h1>
        </div>
        <div className="flex gap-3">
          {text && !loading && (
            <button
              data-testid="insights-refresh"
              onClick={() => fetchInsights(true)}
              className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Vernieuwen
            </button>
          )}
          {text && !loading && (
            <button
              data-testid="insights-copy"
              onClick={() => navigator.clipboard.writeText(text)}
              className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Kopiëren
            </button>
          )}
        </div>
      </div>

      {!text && !loading && !error && (
        <div
          data-testid="insights-empty"
          className="rounded-xl p-12 text-center"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-gray-400 mb-6">
            Laat Claude de process mining resultaten analyseren en concrete verbeterpunten identificeren.
          </p>
          <button
            data-testid="insights-generate"
            onClick={() => fetchInsights(false)}
            className="px-6 py-3 rounded-lg text-white font-medium"
            style={{ background: 'rgba(74,158,255,0.2)', border: '1px solid rgba(74,158,255,0.4)' }}
          >
            Genereer AI Insights
          </button>
        </div>
      )}

      {loading && !text && (
        <div
          data-testid="insights-loading"
          className="rounded-xl p-8 text-center"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-gray-400 animate-pulse">Claude analyseert de procesdata...</div>
        </div>
      )}

      {error && (
        <div
          data-testid="insights-error"
          className="rounded-xl p-6"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => fetchInsights(false)}
            className="mt-3 text-sm text-red-300 hover:text-white underline"
          >
            Opnieuw proberen
          </button>
        </div>
      )}

      {text && (
        <div
          data-testid="insights-result"
          className="rounded-xl p-6"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          {cached && (
            <p className="text-xs text-gray-500 mb-4">
              Uit cache — klik &quot;Vernieuwen&quot; voor nieuwe analyse
            </p>
          )}
          <div
            className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: 'inherit' }}
          >
            {text}
            {loading && <span className="animate-pulse">▍</span>}
          </div>
        </div>
      )}
    </div>
  )
}
