'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  /** id-attribuut van het DOM-element dat geëxporteerd wordt als afbeelding */
  targetId: string
  /** Bestandsnaam zonder extensie */
  filename: string
  /** Optionele CSV-data voor CSV-export */
  csvData?: string
  /** Label voor de CSV-download (bijv. 'varianten.csv') */
  csvFilename?: string
}

const BG = '#0a1628'

export default function ExportMenu({ targetId, filename, csvData, csvFilename }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Sluit menu bij klik buiten
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function exportImage(format: 'png' | 'jpg') {
    setBusy(true)
    setOpen(false)
    try {
      const el = document.getElementById(targetId)
      if (!el) return

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, {
        backgroundColor: BG,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      })

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
      const link = document.createElement('a')
      link.download = `${filename}.${format}`
      link.href = canvas.toDataURL(mimeType, 0.95)
      link.click()
    } finally {
      setBusy(false)
    }
  }

  function exportCsv() {
    if (!csvData) return
    setOpen(false)
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = csvFilename ?? `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasCsv = Boolean(csvData)

  return (
    <div ref={menuRef} className="relative" data-testid="export-menu">
      <button
        data-testid="export-menu-trigger"
        onClick={() => setOpen(o => !o)}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#9ca3af',
        }}
        aria-label="Exporteer visualisatie"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {busy ? (
          <span>Exporteren...</span>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Exporteer
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-50"
          style={{
            background: '#0f1e35',
            border: '1px solid rgba(255,255,255,0.12)',
            minWidth: 160,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-gray-500 text-xs">Exporteer als</p>
          </div>

          <button
            data-testid="export-png"
            onClick={() => exportImage('png')}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <span style={{ color: '#4a9eff', fontSize: 11 }}>PNG</span>
            Afbeelding (PNG)
          </button>

          <button
            data-testid="export-jpg"
            onClick={() => exportImage('jpg')}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <span style={{ color: '#4a9eff', fontSize: 11 }}>JPG</span>
            Afbeelding (JPG)
          </button>

          {hasCsv && (
            <>
              <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
              <button
                data-testid="export-csv"
                onClick={exportCsv}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <span style={{ color: '#34d399', fontSize: 11 }}>CSV</span>
                Tabeldata (CSV)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
