import Link from 'next/link'

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-lf-surface/95 backdrop-blur border-b border-lf-border">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="text-lf-accent font-mono font-bold text-lg tracking-tight"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            LedgerForge
          </span>
          <span className="text-xs font-mono text-lf-muted bg-lf-accent-muted text-lf-accent px-1.5 py-0.5 rounded">
            BAZAAR
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {[
            { href: '/bazaar', label: 'Browse' },
            { href: '/jobs', label: 'Jobs' },
            { href: '/list', label: 'List a Service' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-lf-muted hover:text-lf-ink transition-colors font-medium"
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/bazaar"
          className="text-sm font-semibold text-lf-surface bg-lf-ink hover:bg-lf-accent transition-colors px-4 py-2 rounded-lg"
        >
          Browse Bazaar
        </Link>
      </div>
    </header>
  )
}
