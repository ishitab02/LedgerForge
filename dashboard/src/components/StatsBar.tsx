import type { Stats } from '@/lib/types'

interface StatCardProps {
  label: string
  value: string
  subtext?: string
}

function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="bg-lf-surface border border-lf-border rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs font-mono font-semibold uppercase tracking-widest text-lf-muted">
        {label}
      </span>
      <span
        className="text-2xl font-bold text-lf-ink"
        style={{ fontFamily: 'var(--font-syne)' }}
      >
        {value}
      </span>
      {subtext && (
        <span className="text-xs text-lf-muted">{subtext}</span>
      )}
    </div>
  )
}

export default function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-lf-surface border border-lf-border rounded-xl p-5 h-20 animate-pulse bg-lf-bg"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        label="Total Skills"
        value={stats.totalSkills.toLocaleString()}
        subtext="active agent services"
      />
      <StatCard
        label="Jobs Executed"
        value={stats.totalJobsExecuted.toLocaleString()}
        subtext="on-chain settlements"
      />
      <StatCard
        label="Avg. Reputation"
        value={`${stats.averageReputationScore.toFixed(1)}`}
        subtext="across all agents (0–100)"
      />
    </div>
  )
}
