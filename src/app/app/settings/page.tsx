import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-white">Instellingen</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <Link
          data-testid="settings-issues-link"
          href="/app/settings/issues"
          className="flex items-start gap-4 rounded-xl p-5 hover:opacity-80 transition-opacity"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="mt-0.5 p-2 rounded-lg" style={{ backgroundColor: 'rgba(74,158,255,0.15)' }}>
            <AlertCircle className="h-5 w-5" style={{ color: '#4a9eff' }} />
          </div>
          <div>
            <p className="font-medium text-white">Gemelde issues</p>
            <p className="text-sm text-gray-400 mt-0.5">Bekijk meldingen van gebruikers</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
