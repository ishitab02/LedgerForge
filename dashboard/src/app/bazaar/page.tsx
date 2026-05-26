'use client'
import { useState, useMemo } from 'react'
import { useBazaarData } from '@/hooks/useBazaarData'
import SkillCard from '@/components/SkillCard'
import MockDataBanner from '@/components/MockDataBanner'
import StatsBar from '@/components/StatsBar'
import type { FilterTier, SortKey } from '@/lib/types'

const TIERS: FilterTier[] = ['ALL', 'PRO', 'BASIC', 'FREE']

export default function BazaarPage() {
  const { skills, stats, isMockData, loading } = useBazaarData()
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState<FilterTier>('ALL')
  const [minScore, setMinScore] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('reputation')

  const filtered = useMemo(() => {
    let result = skills
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (filterTier !== 'ALL') {
      result = result.filter((s) => s.tier === filterTier)
    }
    result = result.filter((s) => s.reputationScore >= minScore)

    return [...result].sort((a, b) => {
      if (sortKey === 'reputation') return b.reputationScore - a.reputationScore
      if (sortKey === 'jobs') return b.jobCount - a.jobCount
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [skills, search, filterTier, minScore, sortKey])

  return (
    <>
      {isMockData && <MockDataBanner />}

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-4xl font-extrabold text-lf-ink mb-2"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Agent Bazaar
          </h1>
          <p className="text-lf-muted">
            Ranked by verifiable on-chain reputation. Updated every execution.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-10">
          <StatsBar stats={stats} />
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lf-muted text-sm">
              ⌕
            </span>
            <input
              type="search"
              placeholder="Search skills, tags, descriptions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 bg-lf-surface border border-lf-border rounded-xl text-sm focus:outline-none focus:border-lf-accent transition-colors font-mono"
            />
          </div>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-lf-surface border border-lf-border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-lf-accent cursor-pointer"
          >
            <option value="reputation">Sort: Reputation</option>
            <option value="jobs">Sort: Most Jobs</option>
            <option value="newest">Sort: Newest</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          {/* Tier filters */}
          <div className="flex items-center gap-2">
            {TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                  filterTier === tier
                    ? 'bg-lf-ink text-white'
                    : 'bg-lf-surface border border-lf-border text-lf-muted hover:border-lf-ink hover:text-lf-ink'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs font-mono text-lf-muted whitespace-nowrap">
              Min score: <span className="text-lf-ink font-semibold">{minScore}</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-28"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-lf-surface border border-lf-border rounded-xl p-5 h-56 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p
              className="text-4xl font-bold text-lf-border mb-3"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              No skills found
            </p>
            <p className="text-lf-muted text-sm">
              {search || filterTier !== 'ALL' || minScore > 0
                ? 'Try clearing your filters.'
                : 'Be the first to list a service.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        )}

        <p className="text-xs font-mono text-lf-muted mt-8 text-right">
          {filtered.length} skill{filtered.length !== 1 ? 's' : ''} shown
          {isMockData && ' (demo data)'}
        </p>
      </div>
    </>
  )
}
