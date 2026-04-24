import Link from 'next/link'

export const metadata = {
  title: 'Verwerkersovereenkomst — Retroductus',
}

export default function DpaPage() {
  return (
    <main className="min-h-screen py-16 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/register" className="text-blue-400 hover:underline text-sm">
            ← Terug naar registratie
          </Link>
        </div>
        <div
          className="rounded-2xl p-8 prose prose-invert max-w-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h1 className="text-3xl font-semibold text-white mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Verwerkersovereenkomst
          </h1>
          <p className="text-gray-400 text-sm mb-8">Versie 1.0 — ingangsdatum 16 maart 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">1. Partijen</h2>
            <p className="text-gray-300">
              <strong className="text-white">Verwerkingsverantwoordelijke:</strong> De klant die event logs uploadt naar Retroductus.
            </p>
            <p className="text-gray-300 mt-2">
              <strong className="text-white">Verwerker:</strong> Ductus (Pieter de Brabander), Nederland — pieter@debrabander.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">2. Onderwerp en duur</h2>
            <p className="text-gray-300">
              Deze overeenkomst regelt de verwerking van persoonsgegevens en bedrijfsvertrouwelijke procesdata die de verwerkingsverantwoordelijke uploadt naar het Retroductus platform (retroductor.nl) voor process mining-analyses. De overeenkomst loopt zolang de klant gebruikmaakt van Retroductus.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">3. Aard en doel van de verwerking</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-300 border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-white font-medium">Gegeven</th>
                    <th className="text-left py-2 pr-4 text-white font-medium">Doel</th>
                    <th className="text-left py-2 text-white font-medium">Bewaartermijn</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">Event logs (XES/CSV)</td>
                    <td className="py-2 pr-4">Process mining-analyse</td>
                    <td className="py-2">Verwijderd na analyse, max. 30 dagen</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4">Analyse-resultaten (geaggregeerd)</td>
                    <td className="py-2 pr-4">Rapportage aan klant</td>
                    <td className="py-2">Zolang account actief</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Accountgegevens (e-mail)</td>
                    <td className="py-2 pr-4">Authenticatie en communicatie</td>
                    <td className="py-2">Zolang account actief</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-400 text-sm mt-3">
              Event logs worden niet gebruikt voor trainingsdoeleinden en niet gedeeld met derden buiten de subverwerkers in artikel 5.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">4. Verplichtingen verwerker</h2>
            <ul className="text-gray-300 space-y-2 list-disc list-inside">
              <li>Verwerking uitsluitend op basis van gedocumenteerde instructies van de verwerkingsverantwoordelijke</li>
              <li>Versleuteling van data in transit (TLS 1.3) en at rest (AES-256)</li>
              <li>Toegangsbeperking via Row Level Security en JWT-authenticatie</li>
              <li>Melding bij datalek binnen 72 uur na ontdekking</li>
              <li>Verwijdering of teruggave van gegevens na beëindiging op verzoek</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">5. Subverwerkers</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-300 border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-white font-medium">Subverwerker</th>
                    <th className="text-left py-2 pr-4 text-white font-medium">Land</th>
                    <th className="text-left py-2 text-white font-medium">Dienst</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Supabase Inc.', 'VS (EU-regio)', 'Database en authenticatie'],
                    ['Vercel Inc.', 'VS (EU-regio)', 'Frontend hosting'],
                    ['Railway Corp.', 'VS', 'Engine hosting'],
                    ['Anthropic PBC', 'VS', 'AI-analyse (Pro plan)'],
                  ].map(([name, land, dienst]) => (
                    <tr key={name} className="border-b border-white/5">
                      <td className="py-2 pr-4">{name}</td>
                      <td className="py-2 pr-4">{land}</td>
                      <td className="py-2">{dienst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">6. Rechten van betrokkenen</h2>
            <p className="text-gray-300">
              Gebruikers kunnen hun account en alle bijbehorende data verwijderen via de accountinstellingen. Voor vragen over inzage, rectificatie of verwijdering: pieter@debrabander.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Toepasselijk recht</h2>
            <p className="text-gray-300">
              Deze overeenkomst is onderworpen aan Nederlands recht. Geschillen worden voorgelegd aan de bevoegde rechter te Nederland.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
