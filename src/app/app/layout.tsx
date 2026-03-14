import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import EmbedLayout from '@/components/EmbedLayout'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const nav = (
    <nav data-testid="app-nav" className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <Link data-testid="app-logo" href="/app" className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full" style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }} />
        <span className="font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Retroductus</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/app/projects/new"
          data-testid="nav-new-project"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }}
        >
          Nieuw project
        </Link>
        <span className="text-sm text-gray-400">{user.email}</span>
        <form action={logout}>
          <button data-testid="nav-logout" type="submit" className="text-sm text-gray-400 hover:text-white">
            Uitloggen
          </button>
        </form>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen" style={{ background: '#0a1628', color: '#e2e8f0' }}>
      {/* EmbedLayout verbergt nav in embedded modus */}
      <Suspense fallback={nav}>
        <EmbedLayout nav={nav} />
      </Suspense>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
