'use client'

import { useEmbedded } from './EmbedLayout'
import { IssueReportButton } from './IssueReportButton'

/**
 * Toont de IssueReportButton alleen buiten embedded modus.
 * Gebruik binnen een <Suspense> wrapper (vanwege useSearchParams).
 */
export default function IssueReportWrapper() {
  const isEmbedded = useEmbedded()
  if (isEmbedded) return null
  return <IssueReportButton />
}
