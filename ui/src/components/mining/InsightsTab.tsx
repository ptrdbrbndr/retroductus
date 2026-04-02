'use client'

import { useState } from 'react'
import { Zap, Loader2, RefreshCw } from 'lucide-react'

interface Props { jobId: string }

export function InsightsTab({ jobId }: Props) {
  const [tekst, setTekst] = useState('')
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState('')
  const [geladen, setGeladen] = useState(false)

  const laadInsights = async (ververs = false) => {
    setLaden(true)
    if (ververs) setTekst('')
    setFout('')

    const url = `/api/insights/${jobId}${ververs ? '?refresh=1' : ''}`
    let resp: Response
    try {
      resp = await fetch(url)
    } catch {
      setFout('Verbinding mislukt. Probeer opnieuw.')
      setLaden(false)
      return
    }

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}))
      setFout(body.error || 'AI-inzichten ophalen mislukt.')
      setLaden(false)
      return
    }

    const reader = resp.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.text) setTekst(prev => prev + data.text)
          if (data.done) { setLaden(false); setGeladen(true) }
        } catch { /* lege regel of partial chunk */ }
      }
    }
    setLaden(false)
    setGeladen(true)
  }

  // Markdown-lite: **bold** en # headers
  const renderTekst = (t: string) =>
    t.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-gray-900 mt-4 mb-1 text-base">{line.slice(3)}</h3>
      if (line.startsWith('# '))  return <h2 key={i} className="font-bold text-gray-900 mt-5 mb-2 text-lg">{line.slice(2)}</h2>
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-gray-800">{line.slice(2, -2)}</p>
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} className="ml-4 text-sm text-gray-700 list-disc">{line.slice(2)}</li>
      }
      if (line.trim() === '') return <br key={i} />
      return <p key={i} className="text-sm text-gray-700 leading-relaxed">{line}</p>
    })

  if (!geladen && !laden) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mb-4">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">AI Inzichten</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          Claude analyseert je procesmodel en geeft concrete verbeteraanbevelingen in gewone taal.
        </p>
        <button
          data-testid="insights-generate-btn"
          onClick={() => laadInsights()}
          className="px-6 py-2.5 text-sm font-medium text-white rounded-lg gradient-bg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Zap className="h-4 w-4" /> Genereer inzichten
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Zap className="h-4 w-4" style={{ color: 'var(--retro-teal)' }} />
          AI Inzichten
        </h3>
        {geladen && !laden && (
          <button
            onClick={() => laadInsights(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Vernieuwen
          </button>
        )}
      </div>

      {fout && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{fout}</p>
      )}

      <div
        data-testid="insights-text"
        className="prose max-w-none text-sm leading-relaxed"
        style={{ minHeight: 120 }}
      >
        {renderTekst(tekst)}
        {laden && (
          <span data-testid="insights-loading" className="inline-flex items-center gap-1.5 text-xs text-gray-400 mt-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Claude denkt na…
          </span>
        )}
      </div>
    </div>
  )
}
