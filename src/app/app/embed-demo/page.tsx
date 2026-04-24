'use client'

import Link from 'next/link'

/**
 * Embed-demo pagina — toont hoe Retroductus embedded in Conductus eruitziet.
 * Gebruik ?embedded=true om de navigatie te verbergen.
 */
export default function EmbedDemoPage() {
  return (
    <div data-testid="embed-demo-page" className="max-w-3xl mx-auto">
      <h1
        className="text-3xl font-semibold text-white mb-4"
        style={{ fontFamily: 'Cormorant Garamond, serif' }}
      >
        Embedded modus — demo
      </h1>

      <p className="text-gray-400 mb-8 text-sm leading-relaxed">
        Deze pagina demonstreert hoe Retroductus in een externe applicatie (zoals Conductus) kan worden ingesloten.
        Voeg <code className="px-1 py-0.5 rounded text-blue-300" style={{ background: 'rgba(74,158,255,0.1)' }}>?embedded=true</code> toe
        aan de URL om de navigatie te verbergen en Retroductus als iframe te tonen.
      </p>

      <div
        className="rounded-2xl p-6 mb-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h2 className="text-white font-medium mb-3">Integratie instructies</h2>
        <ul className="space-y-2 text-sm text-gray-400 list-disc list-inside">
          <li>Voeg <code className="text-blue-300">?embedded=true</code> toe aan de URL</li>
          <li>De navigatiebalk wordt automatisch verborgen</li>
          <li>De embedded-cookie blijft 8 uur actief voor de sessie</li>
          <li>Gebruik een <code className="text-blue-300">iframe</code> of navigeer direct naar de gewenste pagina</li>
        </ul>
      </div>

      <div className="flex gap-4">
        <Link
          data-testid="embed-demo-link-embedded"
          href="/app?embedded=true"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
        >
          Bekijk dashboard (embedded)
        </Link>
        <Link
          data-testid="embed-demo-link-normal"
          href="/app"
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Bekijk dashboard (normaal)
        </Link>
      </div>
    </div>
  )
}
