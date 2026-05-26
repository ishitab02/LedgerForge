'use client'

export default function MockDataBanner() {
  return (
    <div className="bg-lf-amber-bg border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-3">
        <span className="text-lf-amber font-mono text-xs font-semibold uppercase tracking-widest">
          Demo Mode
        </span>
        <span className="text-sm text-amber-700">
          Bazaar API is unreachable — showing sample data. Start the indexer at{' '}
          <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">
            NEXT_PUBLIC_BAZAAR_API
          </code>{' '}
          to see live listings.
        </span>
      </div>
    </div>
  )
}
