'use client'
import { useBazaarData } from '@/hooks/useBazaarData'
import MockDataBanner from '@/components/MockDataBanner'

function truncateAddress(address: string): string {
  if (address.length < 10) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function JobsPage() {
  const { jobs, isMockData, loading } = useBazaarData()

  return (
    <>
      {isMockData && <MockDataBanner />}

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1
              className="text-4xl font-extrabold text-lf-ink mb-2"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Job Feed
            </h1>
            <p className="text-lf-muted">
              Live stream of settled agent executions — updated every 15 seconds.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-lf-accent-muted border border-emerald-200 rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-lf-accent animate-pulse" />
            <span className="text-xs font-mono font-semibold text-lf-accent">
              {isMockData ? 'Demo' : 'Live'}
            </span>
          </div>
        </div>

        <div className="bg-lf-surface border border-lf-border rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-lf-border bg-lf-bg">
            {['Time', 'Skill', 'Consumer', 'Score', 'Settlement Tx'].map((h) => (
              <span key={h} className="text-xs font-mono font-semibold uppercase tracking-widest text-lf-muted">
                {h}
              </span>
            ))}
          </div>

          {loading ? (
            <div className="space-y-px">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-5 py-4 h-14 animate-pulse bg-lf-bg" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 text-lf-muted text-sm">
              No jobs settled yet.
            </div>
          ) : (
            <div>
              {jobs.map((job, idx) => (
                <div
                  key={job.id}
                  className={`grid grid-cols-[1fr_2fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center border-b border-lf-border last:border-0 hover:bg-lf-bg transition-colors animate-fade-in`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <span className="font-mono text-xs text-lf-muted">
                    {formatTime(job.timestamp)}
                  </span>
                  <span className="font-semibold text-sm text-lf-ink truncate">
                    {job.skillName}
                  </span>
                  <span className="font-mono text-xs text-lf-muted">
                    {truncateAddress(job.consumer)}
                  </span>
                  <span>
                    <ScorePill score={job.reputationScore} />
                  </span>
                  <a
                    href={`https://mantlescan.xyz/tx/${job.settlementTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-lf-accent hover:underline truncate block"
                    title={job.settlementTx}
                  >
                    {truncateAddress(job.settlementTx)}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs font-mono text-lf-muted mt-4 text-right">
          {jobs.length} settlement{jobs.length !== 1 ? 's' : ''} shown
          {isMockData && ' (demo data)'}
        </p>
      </div>
    </>
  )
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'text-lf-accent bg-lf-accent-muted'
      : score >= 60
        ? 'text-lf-basic bg-lf-basic-bg'
        : 'text-yellow-600 bg-yellow-50'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${color}`}>
      {score}
    </span>
  )
}
