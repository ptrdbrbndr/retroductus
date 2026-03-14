'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'

export default function NewProjectPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFile(f: File) {
    if (!f.name.endsWith('.csv')) {
      setError('Alleen CSV-bestanden zijn toegestaan.')
      return
    }
    setFile(f)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Upload mislukt.')
      setLoading(false)
      return
    }
    const { job_id } = await res.json()
    router.push(`/app/projects/${job_id}`)
  }

  return (
    <div data-testid="new-project-page" className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold text-white mb-8" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        Nieuw project
      </h1>
      <form onSubmit={handleSubmit}>
        <div
          data-testid="upload-dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className="cursor-pointer rounded-2xl p-16 text-center transition-colors"
          style={{
            border: `2px dashed ${dragging ? '#4a9eff' : 'rgba(255,255,255,0.12)'}`,
            background: dragging ? 'rgba(74,158,255,0.05)' : 'rgba(255,255,255,0.02)',
          }}
        >
          <Upload className="mx-auto mb-4 text-gray-400" size={40} />
          <p className="text-white font-medium mb-1">Sleep je CSV hier naartoe</p>
          <p className="text-gray-400 text-sm">of klik om een bestand te kiezen</p>
          {file && (
            <p data-testid="upload-filename" className="mt-4 text-blue-400 text-sm font-medium">{file.name}</p>
          )}
        </div>
        <input
          data-testid="upload-input"
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        <button
          data-testid="upload-submit"
          type="submit"
          disabled={!file || loading}
          className="mt-6 w-full py-3 rounded-lg font-medium text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
        >
          {loading ? 'Analyseren...' : 'Analyseer log'}
        </button>
      </form>
    </div>
  )
}
