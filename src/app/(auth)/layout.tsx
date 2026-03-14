export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1628' }}>
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full" style={{ background: 'linear-gradient(135deg, #4a9eff 0%, #7c3aed 100%)' }} />
            <span className="font-semibold text-white" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem' }}>
              Retroductus
            </span>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
