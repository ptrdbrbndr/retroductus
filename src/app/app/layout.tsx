import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  async function signOut() {
    'use server'
    const sb = await createClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f1a2e' }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(11,29,58,0.95)' }}
        data-testid="app-nav"
      >
        <a href="/app" className="flex items-center gap-2" data-testid="app-logo">
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 600, color: 'white' }}>
            Retroductus
          </span>
        </a>

        <div className="flex items-center gap-6">
          <a href="/app/projects/new" data-testid="nav-new-project"
            className="text-sm font-medium px-4 py-2 rounded-lg gradient-bg text-white">
            + Nieuw project
          </a>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{user.email}</span>
          <form action={signOut}>
            <button type="submit" data-testid="nav-logout"
              className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Uitloggen
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
