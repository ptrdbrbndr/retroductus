'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FlaskConical, Loader2, ArrowLeft } from 'lucide-react'

export default function NewProjectPage() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFout, setUploadFout] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setUploadFout('')
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'xes') {
      setUploadFout('Alleen CSV en XES bestanden zijn toegestaan.')
      return
    }
    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setUploadFout('')
    const form = new FormData()
    form.append('file', selectedFile)
    const resp = await fetch('/api/upload', { method: 'POST', body: form })
    setUploading(false)
    if (!resp.ok) {
      const body = await resp.json()
      setUploadFout(body.error || 'Upload mislukt.')
    } else {
      const { job_id } = await resp.json()
      if (job_id) router.push(`/app/projects/${job_id}`)
    }
  }

  return (
    <div data-testid="new-project-page" className="max-w-xl mx-auto">
      <div className="mb-8">
        <a href="/app" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
          <ArrowLeft className="h-4 w-4" /> Terug naar dashboard
        </a>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--retro-navy)' }}>Nieuwe analyse</h1>
        <p className="text-sm text-gray-500 mt-1">Upload een event log om een procesanalyse te starten.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div
          data-testid="upload-dropzone"
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl px-6 py-14 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileRef}
            data-testid="upload-input"
            type="file"
            accept=".csv,.xes"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload className="h-10 w-10 mx-auto mb-4 text-gray-300" />
          {selectedFile ? (
            <div>
              <p data-testid="upload-filename" className="text-base font-medium text-gray-800">{selectedFile.name}</p>
              <p className="text-sm text-gray-400 mt-1">{(selectedFile.size / 1024).toFixed(0)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-base font-medium text-gray-600">Sleep een bestand hierheen of klik om te bladeren</p>
              <p className="text-sm text-gray-400 mt-1">Ondersteunde formaten: CSV, XES — max. 10 MB (Free tier)</p>
            </div>
          )}
        </div>

        {uploadFout && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{uploadFout}</p>
        )}

        <div className="mt-6 space-y-3">
          <button
            data-testid="upload-submit"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full py-3 text-sm font-medium text-white rounded-lg gradient-bg hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin" data-testid="upload-loading" /> Uploaden en analyseren...</>
              : <><FlaskConical className="h-4 w-4" /> Analyse starten</>
            }
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-50">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Vereiste kolommen voor CSV</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { naam: 'case_id', desc: 'Unieke case' },
              { naam: 'activity', desc: 'Naam activiteit' },
              { naam: 'timestamp', desc: 'Tijdstip (ISO 8601)' },
            ].map(c => (
              <div key={c.naam} className="bg-gray-50 rounded-lg p-3">
                <code className="text-xs font-mono text-gray-700">{c.naam}</code>
                <p className="text-xs text-gray-400 mt-0.5">{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Optioneel: <code className="font-mono">resource</code>, <code className="font-mono">duration_ms</code></p>
        </div>
      </div>
    </div>
  )
}
