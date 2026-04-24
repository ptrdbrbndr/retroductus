'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Database } from 'lucide-react'

type Tab = 'csv' | 'flowable'

export default function NewProjectPage() {
  const [activeTab, setActiveTab] = useState<Tab>('csv')
  const router = useRouter()

  // CSV/XES state
  const [file, setFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Flowable state
  const [dbUrl, setDbUrl] = useState('')
  const [flowableTenantId, setFlowableTenantId] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncError, setSyncError] = useState('')

  function handleFile(f: File) {
    if (!f.name.endsWith('.csv') && !f.name.endsWith('.xes')) {
      setUploadError('Alleen CSV en XES bestanden zijn toegestaan.')
      return
    }
    setFile(f)
    setUploadError('')
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploadLoading(true)
    setUploadError('')

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setUploadError(data.error || 'Upload mislukt.')
      setUploadLoading(false)
      return
    }
    const { job_id } = await res.json()
    router.push(`/app/projects/${job_id}`)
  }

  async function handleFlowableTest() {
    if (!dbUrl) return
    setTestStatus('testing')
    setTestMessage('')

    const res = await fetch('/api/flowable-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db_url: dbUrl }),
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      setTestStatus('ok')
      setTestMessage(`Verbinding OK — ${data.event_count ?? '?'} events gevonden`)
    } else {
      setTestStatus('error')
      setTestMessage(data.error || 'Verbinding mislukt')
    }
  }

  async function handleFlowableSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (testStatus !== 'ok') return
    setSyncLoading(true)
    setSyncError('')

    const res = await fetch('/api/flowable-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db_url: dbUrl, flowable_tenant_id: flowableTenantId }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setSyncError(data.error || 'Sync mislukt.')
      setSyncLoading(false)
      return
    }

    router.push(`/app/projects/${data.job_id}`)
  }

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '10px 20px',
    color: activeTab === tab ? '#4a9eff' : '#94a3b8',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #4a9eff' : '2px solid transparent',
    cursor: 'pointer',
    fontWeight: activeTab === tab ? 600 : 400,
    fontSize: '0.95rem',
    transition: 'color 0.15s',
  })

  return (
    <div data-testid="new-project-page" className="max-w-2xl mx-auto">
      <h1
        className="text-3xl font-semibold text-white mb-8"
        style={{ fontFamily: 'Cormorant Garamond, serif' }}
      >
        Nieuw project
      </h1>

      {/* Tabs */}
      <div
        data-testid="project-tabs"
        className="flex mb-8"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <button
          data-testid="tab-csv"
          type="button"
          onClick={() => setActiveTab('csv')}
          style={tabStyle('csv')}
        >
          <Upload size={14} style={{ display: 'inline', marginRight: 6 }} />
          CSV / XES uploaden
        </button>
        <button
          data-testid="tab-flowable"
          type="button"
          onClick={() => setActiveTab('flowable')}
          style={tabStyle('flowable')}
        >
          <Database size={14} style={{ display: 'inline', marginRight: 6 }} />
          Flowable koppelen
        </button>
      </div>

      {/* CSV/XES Tab */}
      {activeTab === 'csv' && (
        <form data-testid="upload-form" onSubmit={handleUploadSubmit}>
          <div
            data-testid="upload-dropzone"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault()
              setDragging(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            className="cursor-pointer rounded-2xl p-16 text-center transition-colors"
            style={{
              border: `2px dashed ${dragging ? '#4a9eff' : 'rgba(255,255,255,0.12)'}`,
              background: dragging ? 'rgba(74,158,255,0.05)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <Upload className="mx-auto mb-4 text-gray-400" size={40} />
            <p className="text-white font-medium mb-1">Sleep je CSV of XES hier naartoe</p>
            <p className="text-gray-400 text-sm">of klik om een bestand te kiezen</p>
            {file && (
              <p data-testid="upload-filename" className="mt-4 text-blue-400 text-sm font-medium">
                {file.name}
              </p>
            )}
          </div>
          <input
            data-testid="upload-input"
            ref={inputRef}
            type="file"
            accept=".csv,.xes"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {uploadError && <p className="text-red-400 text-sm mt-4">{uploadError}</p>}
          <button
            data-testid="upload-submit"
            type="submit"
            disabled={!file || uploadLoading}
            className="mt-6 w-full py-3 rounded-lg font-medium text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
          >
            {uploadLoading ? 'Analyseren...' : 'Analyseer log'}
          </button>
        </form>
      )}

      {/* Flowable Tab */}
      {activeTab === 'flowable' && (
        <form data-testid="flowable-form" onSubmit={handleFlowableSubmit}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1">PostgreSQL connection string</label>
              <input
                data-testid="flowable-db-url"
                type="text"
                value={dbUrl}
                onChange={e => {
                  setDbUrl(e.target.value)
                  setTestStatus('idle')
                  setTestMessage('')
                }}
                placeholder="postgresql://user:password@host:5432/flowable"
                className="w-full px-4 py-3 rounded-lg text-white text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Flowable Tenant ID</label>
              <input
                data-testid="flowable-tenant-id"
                type="text"
                value={flowableTenantId}
                onChange={e => setFlowableTenantId(e.target.value)}
                placeholder="mijn-tenant"
                className="w-full px-4 py-3 rounded-lg text-white text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  outline: 'none',
                }}
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                data-testid="flowable-test"
                type="button"
                disabled={!dbUrl || testStatus === 'testing'}
                onClick={handleFlowableTest}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ background: 'rgba(74,158,255,0.2)', border: '1px solid rgba(74,158,255,0.4)' }}
              >
                {testStatus === 'testing' ? 'Testen...' : 'Test verbinding'}
              </button>

              {testMessage && (
                <span
                  data-testid="flowable-test-status"
                  className="text-sm"
                  style={{ color: testStatus === 'ok' ? '#4ade80' : '#f87171' }}
                >
                  {testMessage}
                </span>
              )}
            </div>

            {syncError && <p className="text-red-400 text-sm">{syncError}</p>}

            <button
              data-testid="flowable-submit"
              type="submit"
              disabled={testStatus !== 'ok' || syncLoading}
              className="w-full py-3 rounded-lg font-medium text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
            >
              {syncLoading ? 'Synchroniseren...' : 'Koppel Flowable & analyseer'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
