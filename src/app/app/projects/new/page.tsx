'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProjectPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.csv')) setFile(dropped)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError('')

    const form = new FormData()
    form.append('file', file)

    const resp = await fetch('/api/upload', { method: 'POST', body: form })
    const data = await resp.json()

    if (!resp.ok) {
      setError(data.error || 'Upload mislukt')
      setLoading(false)
      return
    }

    router.push(`/app/projects/${data.job_id}`)
  }

  return (
    <div data-testid="new-project-page" className="max-w-2xl">
      <div className="mb-8">
        <a href="/app" data-testid="back-to-dashboard" className="text-sm" style={{ color: 'var(--retro-teal)' }}>
          ← Terug naar projecten
        </a>
        <h1 className="text-2xl font-semibold text-white mt-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Nieuw project
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Upload een CSV-eventlog om process mining te starten.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          data-testid="upload-dropzone"
          className="rounded-xl p-10 text-center cursor-pointer transition-all"
          style={{
            border: `2px dashed ${file ? 'var(--retro-teal)' : 'rgba(255,255,255,0.2)'}`,
            background: file ? 'rgba(46,196,182,0.05)' : 'rgba(255,255,255,0.02)',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            data-testid="upload-input"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div>
              <div className="text-3xl mb-2">✅</div>
              <div className="text-white font-medium" data-testid="upload-filename">{file.name}</div>
              <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
              <button
                type="button"
                className="mt-3 text-sm underline"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onClick={e => { e.stopPropagation(); setFile(null) }}
              >
                Ander bestand kiezen
              </button>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3">📂</div>
              <div className="text-white font-medium mb-1">Sleep je CSV hier</div>
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                of klik om een bestand te kiezen
              </div>
            </div>
          )}
        </div>

        {/* CSV format hint */}
        <div
          className="rounded-lg p-4 text-sm"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="font-medium text-white mb-2">Verwacht CSV-formaat</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            case_id, activity, timestamp, resource (optioneel), duration_ms (optioneel)
          </div>
          <div className="mt-2" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            CASE-001, Ontvangst, 2025-01-01T09:00:00, jan@bedrijf.nl, 3600000
          </div>
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          data-testid="upload-submit"
          className="w-full py-3 rounded-lg font-medium text-white gradient-bg"
          style={{ opacity: !file || loading ? 0.5 : 1 }}
        >
          {loading ? 'Analyseren...' : 'Analyse starten'}
        </button>
      </form>
    </div>
  )
}
