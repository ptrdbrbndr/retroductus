import ComingSoon from './coming-soon'
import { ArrowRight, GitBranch, Zap, BarChart2, Search, CheckCircle, ArrowUpRight } from 'lucide-react'

export default function Home() {
  if (process.env.NEXT_PUBLIC_COMING_SOON === 'true') {
    return <ComingSoon />
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" style={{ color: 'var(--retro-teal)' }} />
            <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--retro-navy)', fontFamily: 'Cormorant Garamond, serif' }}>
              Retroductus
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Functies</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">Hoe het werkt</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Prijzen</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Inloggen</a>
            <a
              href="/register"
              className="text-sm text-white px-4 py-2 rounded-lg gradient-bg hover:opacity-90 transition-opacity"
            >
              Gratis proberen
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-28 overflow-hidden" style={{ background: 'var(--retro-navy)' }}>
        <div className="hero-glow" style={{ width: 500, height: 500, background: '#2EC4B6', opacity: 0.08, top: -100, right: -100 }} />
        <div className="hero-glow" style={{ width: 400, height: 400, background: '#1B6B93', opacity: 0.12, bottom: -80, left: -80 }} />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-8 border"
            style={{ borderColor: 'rgba(46,196,182,0.3)', color: '#2EC4B6', background: 'rgba(46,196,182,0.08)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Onderdeel van de Conductus-suite
          </div>

          <h1 className="text-6xl font-bold text-white leading-[1.05] mb-6"
            style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '-0.01em' }}>
            Kijk terug.<br />
            <span className="gradient-text">Stuur bij.</span><br />
            Leid beter.
          </h1>

          <p className="text-lg text-white/60 max-w-xl mx-auto mb-10 font-light leading-relaxed">
            Ontdek hoe jouw processen werkelijk verlopen op basis van echte data.
            Process discovery, bottleneck-analyse en AI-inzichten — in minuten.
          </p>

          <div className="flex items-center justify-center gap-4">
            <a href="/register" className="inline-flex items-center gap-2 text-white text-sm font-medium px-6 py-3 rounded-lg gradient-bg hover:opacity-90 transition-opacity">
              Gratis starten <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#how" className="inline-flex items-center gap-2 text-sm font-medium px-6 py-3 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
              Hoe het werkt
            </a>
          </div>
        </div>
      </section>

      {/* Stat bar */}
      <section className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-3 divide-x divide-gray-100">
          {[
            { value: '< 60s', label: 'van upload naar inzicht' },
            { value: 'XES · CSV · Flowable', label: 'ondersteunde formaten' },
            { value: 'Claude AI', label: 'verbeteraanbevelingen' },
          ].map((s) => (
            <div key={s.label} className="px-8 first:pl-0 last:pr-0 text-center">
              <div className="text-xl font-semibold mb-1" style={{ color: 'var(--retro-navy)', fontFamily: 'Cormorant Garamond, serif' }}>{s.value}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24" style={{ background: 'var(--retro-stone)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-xl mb-14">
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--retro-navy)' }}>
              Alles wat je nodig hebt voor procesverbetering
            </h2>
            <p className="text-gray-500 leading-relaxed">
              Geen complexe installatie. Geen consultants nodig. Upload je data en Retroductus vertelt je wat er speelt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FeatureCard icon={<Search className="h-5 w-5" />} title="Process Discovery"
              description="Ontdek het werkelijke procesmodel op basis van jouw event-data. Direct-Follows Graphs tonen alle paden en frequenties." />
            <FeatureCard icon={<BarChart2 className="h-5 w-5" />} title="Performance Analytics"
              description="Zie precies waar tijd verloren gaat. Doorlooptijden per activiteit, wachttijden en resource-analyse in één overzicht." featured />
            <FeatureCard icon={<CheckCircle className="h-5 w-5" />} title="Conformance Checking"
              description="Vergelijk het werkelijke procesverloop met jouw normatiefmodel. Identificeer welke cases afwijken en waarom." />
            <FeatureCard icon={<Zap className="h-5 w-5" />} title="AI Insights"
              description="Claude genereert concrete verbeteraanbevelingen in gewone taal. Geen data-expertise nodig." />
            <FeatureCard icon={<GitBranch className="h-5 w-5" />} title="Flowable-koppeling"
              description="Directe integratie met Conductus en Flowable. Geen handmatige export — analyses starten met één klik." />
            <FeatureCard icon={<ArrowUpRight className="h-5 w-5" />} title="CSV & XES upload"
              description="Werk je met een ander systeem? Upload event logs in CSV of XES-formaat en start direct met analyseren." />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--retro-navy)' }}>Drie stappen naar inzicht</h2>
            <p className="text-gray-500">Van ruwe event-data naar concrete actiepunten.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Koppel je data', body: 'Upload een CSV of XES-bestand, of koppel direct aan Flowable. Retroductus verwerkt je event log automatisch.' },
              { step: '02', title: 'Analyseer', body: 'Process discovery, performance-analyse en conformance checking worden automatisch uitgevoerd op jouw data.' },
              { step: '03', title: 'Verbeter', body: 'Lees de AI-gegenereerde aanbevelingen en weet precies welke procesverbeteringen het meeste opleveren.' },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-bold mb-4 leading-none select-none"
                  style={{ color: 'var(--retro-navy)', opacity: 0.06, fontFamily: 'Cormorant Garamond, serif' }}>
                  {item.step}
                </div>
                <div className="-mt-8">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold text-white gradient-bg mb-3">
                    {item.step.replace('0', '')}
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--retro-navy)' }}>{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24" style={{ background: 'var(--retro-stone)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--retro-navy)' }}>Transparante prijzen</h2>
            <p className="text-gray-500">Begin gratis. Schaal op wanneer je groeit.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
            <PricingCard name="Free" price="€0" sub="voor altijd"
              features={['1 project', 'Max 10.000 events', 'Process discovery', 'CSV upload']} />
            <PricingCard name="Starter" price="€29" sub="per maand"
              features={['5 projecten', 'Max 100.000 events', 'Performance analytics', 'PDF exports', 'XES support']} featured />
            <PricingCard name="Pro" price="€79" sub="per maand"
              features={['Onbeperkt', 'AI Insights', 'Flowable-koppeling', 'Team-toegang', 'API-koppeling']} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: 'var(--retro-navy)' }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Begin vandaag nog met analyseren</h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto leading-relaxed">
            Geen creditcard vereist. In minder dan een minuut je eerste procesanalyse.
          </p>
          <a href="/register" className="inline-flex items-center gap-2 text-white text-sm font-medium px-8 py-3 rounded-lg gradient-bg hover:opacity-90 transition-opacity">
            Gratis account aanmaken <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" style={{ color: 'var(--retro-teal)' }} />
            <span style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--retro-navy)', fontWeight: 600 }}>Retroductus</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs">Onderdeel van de Conductus-suite</span>
          </div>
          <div className="flex gap-6 text-xs">
            <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-gray-600 transition-colors">Voorwaarden</a>
            <a href="https://conductus.nl" className="hover:text-gray-600 transition-colors">Conductus</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

function FeatureCard({ icon, title, description, featured }: {
  icon: React.ReactNode; title: string; description: string; featured?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-6 transition-all duration-300 hover:-translate-y-0.5 ${featured ? 'shadow-lg' : ''}`}
      style={{
        background: featured ? 'var(--retro-navy)' : '#fff',
        border: featured ? 'none' : '1px solid #EBEBEB',
        boxShadow: featured ? '0 20px 40px -12px rgba(11,29,58,0.25)' : undefined,
      }}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-4 ${featured ? 'bg-white/10' : 'bg-gray-50'}`}
        style={featured ? { color: '#2EC4B6' } : { color: 'var(--retro-teal)' }}>
        {icon}
      </div>
      <h3 className={`font-semibold mb-2 ${featured ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      <p className={`text-sm leading-relaxed ${featured ? 'text-white/60' : 'text-gray-500'}`}>{description}</p>
    </div>
  )
}

function PricingCard({ name, price, sub, features, featured }: {
  name: string; price: string; sub: string; features: string[]; featured?: boolean
}) {
  return (
    <div className="rounded-xl p-6 flex flex-col" style={{
      background: featured ? 'var(--retro-navy)' : '#fff',
      border: featured ? 'none' : '1px solid #EBEBEB',
      boxShadow: featured ? '0 20px 40px -12px rgba(11,29,58,0.3)' : '0 2px 8px rgba(11,29,58,0.04)',
    }}>
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest mb-3"
          style={{ color: featured ? '#2EC4B6' : '#9CA3AF' }}>{name}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold"
            style={{ color: featured ? 'white' : 'var(--retro-navy)', fontFamily: 'Cormorant Garamond, serif' }}>
            {price}
          </span>
          <span className="text-sm" style={{ color: featured ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>/{sub}</span>
        </div>
      </div>

      <ul className="space-y-2.5 flex-1 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <span style={{ color: '#2EC4B6' }}>✓</span>
            <span style={{ color: featured ? 'rgba(255,255,255,0.8)' : '#4B5563' }}>{f}</span>
          </li>
        ))}
      </ul>

      <a href="/register" className="text-center py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
        style={featured ? { background: 'linear-gradient(135deg, #2EC4B6, #1B6B93)', color: 'white' }
          : { border: '1px solid #E5E7EB', color: '#374151' }}>
        {name === 'Free' ? 'Gratis starten' : 'Probeer gratis'}
      </a>
    </div>
  )
}
