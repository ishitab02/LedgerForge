import Link from 'next/link'
import type { Skill } from '@/lib/types'
import TierBadge from './TierBadge'
import ReputationGauge from './ReputationGauge'

function truncateAddress(address: string): string {
  if (address.length < 10) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export default function SkillCard({ skill }: { skill: Skill }) {
  return (
    <div className="bg-lf-surface border border-lf-border rounded-xl p-5 flex flex-col gap-4 hover:border-lf-accent hover:shadow-sm transition-all duration-200 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TierBadge tier={skill.tier} />
          </div>
          <h3
            className="font-semibold text-lf-ink text-base leading-tight truncate"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {skill.name}
          </h3>
          <p
            className="text-xs text-lf-muted font-mono mt-0.5"
          >
            v{skill.version}
          </p>
        </div>
        <ReputationGauge score={skill.reputationScore} size={56} />
      </div>

      <p className="text-sm text-lf-muted leading-relaxed line-clamp-2">
        {skill.description}
      </p>

      <div className="flex items-center justify-between text-xs font-mono text-lf-muted border-t border-lf-border pt-3">
        <div className="flex items-center gap-3">
          <span title="Jobs executed">
            <span className="text-lf-ink font-semibold">
              {skill.jobCount.toLocaleString()}
            </span>{' '}
            jobs
          </span>
          <span className="text-lf-border">|</span>
          <span title="Price per call">
            {skill.tier === 'FREE' ? (
              <span className="text-lf-accent font-semibold">Free</span>
            ) : (
              <>
                <span className="text-lf-ink font-semibold">
                  ${skill.pricePerCall}
                </span>{' '}
                {skill.acceptedToken}
              </>
            )}
          </span>
        </div>
        <span title={skill.owner} className="truncate max-w-[100px]">
          {truncateAddress(skill.owner)}
        </span>
      </div>

      <Link
        href={`/skill/${skill.id}`}
        className="block text-center text-sm font-semibold text-lf-accent border border-lf-accent rounded-lg py-2 hover:bg-lf-accent hover:text-white transition-colors"
      >
        Use This Skill →
      </Link>
    </div>
  )
}
