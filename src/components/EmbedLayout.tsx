'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Hook: detecteert of embedded modus actief is via searchParam of cookie.
 */
export function useEmbedded(): boolean {
  const searchParams = useSearchParams()
  const [isEmbedded, setIsEmbedded] = useState(false)

  useEffect(() => {
    const fromParam = searchParams.get('embedded') === 'true'
    const fromCookie = document.cookie
      .split(';')
      .some(c => c.trim().startsWith('retroductus_embedded='))

    setIsEmbedded(fromParam || fromCookie)
  }, [searchParams])

  return isEmbedded
}

interface EmbedLayoutProps {
  /** De navigatiebalk die verborgen wordt in embedded modus. */
  nav: React.ReactNode
}

/**
 * Rendert de nav alleen als embedded modus NIET actief is.
 * Gebruik binnen een <Suspense> wrapper (vanwege useSearchParams).
 */
export default function EmbedLayout({ nav }: EmbedLayoutProps) {
  const isEmbedded = useEmbedded()

  if (isEmbedded) return null

  return <>{nav}</>
}
