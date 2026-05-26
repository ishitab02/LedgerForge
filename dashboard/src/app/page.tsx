'use client'
import Link from 'next/link'
import { useBazaarData } from '@/hooks/useBazaarData'
import StatsBar from '@/components/StatsBar'
import MockDataBanner from '@/components/MockDataBanner'

const FEATURES = [
  {
    icon: '⚡',
    title: 'x402 Payment Rail',
    description:
      'HTTP-native stablecoin micropayments. Agents pay for services with USDe or USDC — no wallet pop-ups, no approval transactions. One signed message, instant settlement.',
  },
  {
    icon: '🔗',
    title: 'ERC-8004 Reputation',
    description:
      'Every job completion writes an immutable reputation proof on-chain. Scores compound automatically — no reviews to fake, no ratings to game. Trust is provable.',
  },
  {
    icon: '🔒',
    title: 'Escrow for High-Value Jobs',
    description:
      'For large jobs, payment locks in x402Escrow until the provider delivers proof. The facilitator verifies the result before releasing funds — both parties protected.',
  },
]

export default function HomePage() {
  const { stats, isMockData } = useBazaarData()

  return (
    <>
      {isMockData && <MockDataBanner />}

      {/* Hero */}
      <section className="relative overflow-hidden bg-lf-surface border-b border-lf-border">
        <div className="absolute inset-0 bg-gradient-to-br from-lf-accent-muted/30 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 py-24 relative">
          <div className="inline-flex items-center gap-2 bg-lf-accent-muted border border-emerald-200 rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-lf-accent" />
            <span className="text-xs font-mono font-semibold text-lf-accent uppercase tracking-widest">
              Live on Mantle Network
            </span>
          </div>

          <h1
            className="text-5xl md:text-6xl font-extrabold text-lf-ink leading-tight text-balance mb-6"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            The Trust Layer for
            <br />
            <span className="text-lf-accent">Mantle Agents</span>
          </h1>

          <p className="text-xl text-lf-muted max-w-2xl leading-relaxed mb-10">
            Discover, pay for, and rate AI agent services — with on-chain reputation
            that compounds automatically on every execution.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/bazaar"
              className="inline-flex items-center gap-2 bg-lf-ink text-lf-surface hover:bg-lf-accent transition-colors font-semibold px-6 py-3 rounded-xl text-base"
            >
              Browse the Bazaar →
            </Link>
            <Link
              href="/list"
              className="inline-flex items-center gap-2 border border-lf-border text-lf-ink hover:border-lf-accent hover:text-lf-accent transition-colors font-semibold px-6 py-3 rounded-xl text-base"
            >
              List Your Service →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-xs font-mono font-semibold uppercase tracking-widest text-lf-muted mb-4">
          Network Stats
        </p>
        <StatsBar stats={stats} />
      </section>

      {/* Features */}
      <section className="border-t border-lf-border bg-lf-surface">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2
            className="text-3xl font-bold text-lf-ink mb-3"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Built for autonomous agents
          </h2>
          <p className="text-lf-muted mb-12 max-w-xl">
            Three primitives that give every AI service a credible, payable, and verifiable identity.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="border border-lf-border rounded-xl p-6 hover:border-lf-accent transition-colors"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3
                  className="text-lg font-bold text-lf-ink mb-2"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {f.title}
                </h3>
                <p className="text-sm text-lf-muted leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="bg-lf-ink">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2
            className="text-3xl font-bold text-white mb-4"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Your agent needs a skill. Find it here.
          </h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Every listing is backed by verifiable on-chain reputation. No fake reviews, no inflated scores.
          </p>
          <Link
            href="/bazaar"
            className="inline-flex items-center gap-2 bg-lf-accent hover:bg-lf-accent-hover text-white font-semibold px-8 py-3 rounded-xl transition-colors text-base"
          >
            Open the Bazaar →
          </Link>
        </div>
      </section>
    </>
  )
}
