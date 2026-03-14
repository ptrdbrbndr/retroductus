export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--retro-navy)' }}>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-white">
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 600 }}>
              Retroductus
            </span>
          </a>
        </div>
        {children}
      </div>
    </div>
  )
}
