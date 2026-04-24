'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  path: string
  label: string
  color: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { path: '',            label: 'DFG Overzicht',    color: '#4a9eff', icon: '⬡' },
  { path: '/variants',   label: 'Procesvarianten',  color: '#fbbf24', icon: '↗' },
  { path: '/statistics', label: 'Statistieken',     color: '#34d399', icon: '▦' },
  { path: '/dotted',     label: 'Tijdlijn',         color: '#f472b6', icon: '⋯' },
  { path: '/performance',label: 'Bottlenecks',      color: '#60a5fa', icon: '⚡' },
  { path: '/bpmn',       label: 'BPMN model',       color: '#a78bfa', icon: '□' },
  { path: '/simulation', label: 'Simulatie',        color: '#fb923c', icon: '▶' },
  { path: '/conformance',label: 'Conformance',      color: '#22c55e', icon: '✓' },
  { path: '/insights',   label: 'AI Insights',      color: '#8b5cf6', icon: '✦' },
]

interface Props {
  id: string
}

export default function ProjectNav({ id }: Props) {
  const pathname = usePathname()
  const base = `/app/projects/${id}`

  return (
    <nav data-testid="project-nav" className="space-y-0.5">
      {NAV_ITEMS.map(item => {
        const href = `${base}${item.path}`
        // Exacte match voor root, prefix voor subpagina's
        const isActive = item.path === ''
          ? pathname === href
          : pathname.startsWith(href)

        return (
          <Link
            key={item.path}
            href={href}
            data-testid={`project-nav-${item.path.replace('/', '') || 'overview'}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: isActive ? `${item.color}18` : 'transparent',
              color: isActive ? item.color : '#6b7280',
              fontWeight: isActive ? 500 : 400,
              borderLeft: isActive ? `2px solid ${item.color}60` : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: 13, opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
