'use client'

import { useEffect, useRef } from 'react'

interface Props {
  xml: string
}

export default function BpmnViewer({ xml }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || !xml) return

    let destroyed = false

    import('bpmn-js').then(({ default: BpmnViewerClass }) => {
      if (destroyed || !containerRef.current) return

      // Ruim eventuele vorige viewer op
      if (viewerRef.current) {
        try { viewerRef.current.destroy() } catch {}
        viewerRef.current = null
      }

      const viewer = new BpmnViewerClass({
        container: containerRef.current,
      })
      viewerRef.current = viewer

      viewer.importXML(xml)
        .then(() => {
          if (destroyed) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const canvas = viewer.get('canvas') as any
          canvas.zoom('fit-viewport')
        })
        .catch(() => {})
    }).catch(() => {})

    return () => {
      destroyed = true
      if (viewerRef.current) {
        try { viewerRef.current.destroy() } catch {}
        viewerRef.current = null
      }
    }
  }, [xml])

  return (
    <div
      ref={containerRef}
      data-testid="bpmn-canvas"
      style={{ width: '100%', height: '100%' }}
    />
  )
}
