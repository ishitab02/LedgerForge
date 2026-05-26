'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartData,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { useBazaarData } from '@/hooks/useBazaarData'
import TierBadge from '@/components/TierBadge'
import ReputationGauge from '@/components/ReputationGauge'
import PaymentModal from '@/components/PaymentModal'
import MockDataBanner from '@/components/MockDataBanner'
import type { Skill } from '@/lib/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

function truncateAddress(address: string): string {
  if (address.length < 10) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { skills, jobs, isMockData, loading } = useBazaarData()
  const [skill, setSkill] = useState<Skill | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const found = skills.find((s) => s.id === id)
    if (found) setSkill(found)
  }, [skills, id])

  const skillJobs = jobs.filter((j) => j.skillId === id).slice(0, 10)

  const chartData: ChartData<'bar'> = {
    labels: skill?.reputationHistory.map((p) => formatDate(p.timestamp)) ?? [],
    datasets: [
      {
        label: 'Reputation Score',
        data: skill?.reputationHistory.map((p) => p.score) ?? [],
        backgroundColor: '#00B37E',
        borderRadius: 4,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: '#E4E4E7' },
        ticks: { font: { family: 'var(--font-mono)', size: 11 } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'var(--font-mono)', size: 11 } },
      },
    },
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-lf-surface border border-lf-border rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p
          className="text-4xl font-bold text-lf-border mb-3"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          Skill not found
        </p>
        <Link href="/bazaar" className="text-lf-accent hover:underline text-sm">
          ← Back to Bazaar
        </Link>
      </div>
    )
  }

  return (
    <>
      {isMockData && <MockDataBanner />}
      {showModal && (
        <PaymentModal skill={skill} onClose={() => setShowModal(false)} />
      )}

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Back */}
        <Link
          href="/bazaar"
          className="text-sm text-lf-muted hover:text-lf-ink transition-colors"
        >
          ← Back to Bazaar
        </Link>

        {/* Header */}
        <div className="bg-lf-surface border border-lf-border rounded-2xl p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <TierBadge tier={skill.tier} />
                <span className="text-xs font-mono text-lf-muted">v{skill.version}</span>
              </div>
              <h1
                className="text-3xl font-extrabold text-lf-ink mb-3"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {skill.name}
              </h1>
              <p className="text-lf-muted leading-relaxed">{skill.description}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                {skill.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono bg-lf-bg border border-lf-border px-2 py-0.5 rounded text-lf-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ReputationGauge score={skill.reputationScore} size={80} />
              <span className="text-xs font-mono text-lf-muted">reputation</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              label: 'Owner',
              value: (
                <a
                  href={`https://mantlescan.xyz/address/${skill.owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-lf-accent hover:underline"
                >
                  {truncateAddress(skill.owner)}
                </a>
              ),
            },
            {
              label: 'ERC-8004 Agent ID',
              value: (
                <a
                  href={`https://mantlescan.xyz/address/${skill.agentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-lf-accent hover:underline"
                >
                  {truncateAddress(skill.agentId)}
                </a>
              ),
            },
            {
              label: 'Endpoint',
              value: (
                <span className="font-mono text-sm text-lf-muted italic">
                  Available on access
                </span>
              ),
            },
            {
              label: 'Metadata URI',
              value: (
                <a
                  href={`https://ipfs.io/ipfs/${skill.metadataURI.replace('ipfs://', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-lf-accent hover:underline truncate block max-w-xs"
                >
                  {skill.metadataURI}
                </a>
              ),
            },
            {
              label: 'Total Jobs',
              value: (
                <span className="font-mono text-sm font-bold text-lf-ink">
                  {skill.jobCount.toLocaleString()}
                </span>
              ),
            },
            {
              label: 'Listed',
              value: (
                <span className="font-mono text-sm text-lf-ink">
                  {formatDate(skill.createdAt)}
                </span>
              ),
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-lf-surface border border-lf-border rounded-xl p-4"
            >
              <p className="text-xs font-mono text-lf-muted uppercase tracking-widest mb-1">
                {label}
              </p>
              {value}
            </div>
          ))}
        </div>

        {/* Reputation History */}
        <div className="bg-lf-surface border border-lf-border rounded-2xl p-6">
          <h2
            className="text-xl font-bold text-lf-ink mb-1"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Reputation History
          </h2>
          <p className="text-xs font-mono text-lf-muted mb-6">
            Score per job completion over time
          </p>
          {skill.reputationHistory.length > 0 ? (
            <Bar data={chartData} options={chartOptions} height={120} />
          ) : (
            <p className="text-sm text-lf-muted text-center py-8">
              No history yet — scores appear after first execution.
            </p>
          )}
        </div>

        {/* Use This Skill */}
        <div className="bg-lf-ink rounded-2xl p-8">
          <h2
            className="text-2xl font-bold text-white mb-2"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Use This Skill
          </h2>
          <p className="text-zinc-400 mb-6 text-sm">
            Connect your wallet to access this service on Mantle Network. Payment is
            locked in escrow until the job completes.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-1">
                Price per call
              </p>
              <p className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                {skill.tier === 'FREE' ? (
                  <span className="text-lf-accent">Free</span>
                ) : (
                  `$${skill.pricePerCall} ${skill.acceptedToken}`
                )}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-lf-accent hover:bg-lf-accent-hover text-white font-semibold px-8 py-3 rounded-xl transition-colors whitespace-nowrap"
            >
              {skill.tier === 'FREE' ? 'Access Skill →' : 'Connect & Pay →'}
            </button>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-lf-surface border border-lf-border rounded-2xl p-6">
          <h2
            className="text-xl font-bold text-lf-ink mb-4"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Recent Executions
          </h2>
          {skillJobs.length === 0 ? (
            <p className="text-sm text-lf-muted text-center py-6">
              No job history available yet.
            </p>
          ) : (
            <div className="space-y-2">
              {skillJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-2.5 border-b border-lf-border last:border-0 gap-4"
                >
                  <span className="font-mono text-xs text-lf-muted whitespace-nowrap">
                    {new Date(job.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-mono text-xs text-lf-muted truncate flex-1">
                    {truncateAddress(job.consumer)}
                  </span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      job.reputationScore >= 80
                        ? 'text-lf-accent'
                        : job.reputationScore >= 60
                          ? 'text-lf-basic'
                          : 'text-yellow-500'
                    }`}
                  >
                    {job.reputationScore}/100
                  </span>
                  <a
                    href={`https://mantlescan.xyz/tx/${job.settlementTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-lf-muted hover:text-lf-accent truncate max-w-[120px]"
                  >
                    {truncateAddress(job.settlementTx)}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
