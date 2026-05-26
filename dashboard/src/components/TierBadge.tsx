import type { Tier } from '@/lib/types'

const TIER_CONFIG: Record<
  Tier,
  { label: string; className: string }
> = {
  PRO: {
    label: 'PRO',
    className:
      'bg-lf-pro-bg text-lf-pro border border-purple-200',
  },
  BASIC: {
    label: 'BASIC',
    className:
      'bg-lf-basic-bg text-lf-basic border border-blue-200',
  },
  FREE: {
    label: 'FREE',
    className:
      'bg-lf-free-bg text-lf-free border border-zinc-200',
  },
}

export default function TierBadge({ tier }: { tier: Tier }) {
  const { label, className } = TIER_CONFIG[tier]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold tracking-wider ${className}`}
    >
      {label}
    </span>
  )
}
