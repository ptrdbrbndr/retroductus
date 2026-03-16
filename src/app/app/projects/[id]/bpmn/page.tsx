'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const BpmnViewer = dynamic(() => import('@/components/BpmnViewer'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="text-gray-400 text-sm">BPMN model laden...</p>
    </div>
  ),
})

export default function BpmnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [bpmnXml, setBpmnXml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: job } = await supabase
        .from('mining_jobs')
        .select('result')
        .eq('id', id)
        .single()

      if (job?.result?.bpmn_xml) {
        setBpmnXml(job.result.bpmn_xml)
      }
      setLoading(false)
    }
    load()
  }, [id])

  function handleDownload() {
    if (!bpmnXml) return
    const blob = new Blob([bpmnXml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `process-model-${id}.bpmn`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div data-testid="bpmn-page" style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            BPMN procesmodel
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Ontdekt via Inductive Miner — formeel procesmodel met parallelle paden en keuzes
          </p>
        </div>
        <div className="flex items-center gap-3">
          {bpmnXml && (
            <button
              data-testid="bpmn-download"
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: 'rgba(74,158,255,0.15)', border: '1px solid rgba(74,158,255,0.3)' }}
              aria-label="Download BPMN bestand"
            >
              Download .bpmn
            </button>
          )}
          <Link href={`/app/projects/${id}`} className="text-sm text-gray-400 hover:text-white">
            ← Terug naar project
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Laden...</p>
        </div>
      ) : !bpmnXml ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">
            Geen BPMN-model beschikbaar. Analyseer het log opnieuw om een BPMN-model te genereren.
          </p>
        </div>
      ) : (
        <div
          data-testid="bpmn-viewer-container"
          className="flex-1 rounded-xl overflow-hidden"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            background: '#ffffff',
          }}
        >
          <BpmnViewer xml={bpmnXml} />
        </div>
      )}
    </div>
  )
}
