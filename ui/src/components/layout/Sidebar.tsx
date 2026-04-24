'use client'

import { useRouter, usePathname } from 'next/navigation'
import { GitBranch, LayoutDashboard, FlaskConical, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/app/projects', label: 'Analyses', icon: FlaskConical, exact: false },
  { href: '/app/settings', label: 'Instellingen', icon: Settings, exact: false },
]

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <aside
      data-testid="sidebar"
      className="w-56 shrink-0 h-screen sticky top-0 flex flex-col border-r border-gray-100 bg-white"
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" style={{ color: 'var(--retro-teal)' }} />
          <span
            className="text-base font-semibold"
            style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--retro-navy)' }}
          >
            Retroductus
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <a
            key={href}
            href={href}
            data-testid={label === 'Dashboard' ? 'nav-dashboard' : `nav-${label.toLowerCase()}`}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(href, exact)
                ? 'font-medium text-white gradient-bg'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </a>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          data-testid="nav-logout"
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" aria-label="Uitloggen" />
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
