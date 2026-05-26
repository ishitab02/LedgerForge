'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Skill, Stats, Job } from '@/lib/types'

// ── Mock fallback data ────────────────────────────────────────────────────────

const MOCK_SKILLS: Skill[] = [
  {
    id: '1',
    name: 'GPT-4o Code Review',
    version: '1.2.0',
    endpoint: 'https://api.example.com/review',
    metadataURI: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    owner: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    pricePerCall: '0.50',
    acceptedToken: 'USDe',
    reputationScore: 94,
    jobCount: 1847,
    tier: 'PRO',
    agentId: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    description:
      'Production-grade code review powered by GPT-4o. Returns structured feedback with severity ratings and fix suggestions.',
    tags: ['code', 'review', 'gpt4o'],
    createdAt: '2026-03-10T12:00:00Z',
    reputationHistory: Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(Date.now() - (11 - i) * 7 * 86400000).toISOString(),
      score: 82 + Math.floor(Math.random() * 15),
      jobId: `job-${i}`,
    })),
  },
  {
    id: '2',
    name: 'On-Chain Data Analyst',
    version: '0.9.4',
    endpoint: 'https://api.example.com/analyze',
    metadataURI: 'ipfs://QmPChd2hVbrJ6bfo3WBcTW4iZnpHm8TEzWkLHmLpXhF57A',
    owner: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    pricePerCall: '1.00',
    acceptedToken: 'USDC',
    reputationScore: 88,
    jobCount: 962,
    tier: 'PRO',
    agentId: '0x8004A818000000000000000000000000000000002',
    description:
      'Deep Mantle chain analytics: wallet profiling, DeFi position summarization, and risk scoring for any address.',
    tags: ['analytics', 'onchain', 'defi'],
    createdAt: '2026-02-20T09:30:00Z',
    reputationHistory: Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(Date.now() - (11 - i) * 7 * 86400000).toISOString(),
      score: 78 + Math.floor(Math.random() * 14),
      jobId: `job-rep-${i}`,
    })),
  },
  {
    id: '3',
    name: 'IPFS Document Summarizer',
    version: '2.0.1',
    endpoint: 'https://api.example.com/summarize',
    metadataURI: 'ipfs://QmT9qk3CRYbFDWpDFYeAv8T8H1gnongJR4W5vf9uJ7PQfG',
    owner: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    pricePerCall: '0.10',
    acceptedToken: 'USDe',
    reputationScore: 76,
    jobCount: 3201,
    tier: 'BASIC',
    agentId: '0x8004A818000000000000000000000000000000003',
    description:
      'Fetch any IPFS document and return a concise summary with key points and sentiment.',
    tags: ['ipfs', 'summarization', 'nlp'],
    createdAt: '2026-01-05T18:00:00Z',
    reputationHistory: Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(Date.now() - (11 - i) * 7 * 86400000).toISOString(),
      score: 68 + Math.floor(Math.random() * 12),
      jobId: `job-sum-${i}`,
    })),
  },
  {
    id: '4',
    name: 'Translation Agent',
    version: '1.0.0',
    endpoint: 'https://api.example.com/translate',
    metadataURI: 'ipfs://QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848PPxR8m',
    owner: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    pricePerCall: '0.00',
    acceptedToken: 'USDC',
    reputationScore: 61,
    jobCount: 449,
    tier: 'FREE',
    agentId: '0x8004A818000000000000000000000000000000004',
    description:
      'Free multilingual translation service supporting 50+ languages. Community-maintained.',
    tags: ['translation', 'nlp', 'multilingual'],
    createdAt: '2026-04-01T00:00:00Z',
    reputationHistory: Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(Date.now() - (11 - i) * 7 * 86400000).toISOString(),
      score: 55 + Math.floor(Math.random() * 12),
      jobId: `job-tr-${i}`,
    })),
  },
]

const MOCK_STATS: Stats = {
  totalSkills: 4,
  totalJobsExecuted: 6459,
  averageReputationScore: 79.75,
}

const MOCK_JOBS: Job[] = Array.from({ length: 10 }, (_, i) => ({
  id: `job-mock-${i}`,
  skillId: MOCK_SKILLS[i % MOCK_SKILLS.length].id,
  skillName: MOCK_SKILLS[i % MOCK_SKILLS.length].name,
  consumer: `0x${(i + 1).toString(16).padStart(40, '0')}`,
  reputationScore: 70 + Math.floor(Math.random() * 30),
  settlementTx: `0x${'ab'.repeat(32)}`,
  timestamp: new Date(Date.now() - i * 90000).toISOString(),
}))

// ── API shape normalization ───────────────────────────────────────────────────
// The indexer's SkillRecord uses different field names than the dashboard Skill
// type. Normalize here so the rest of the app uses the canonical shape.

interface RawSkillRecord {
  skillId: number
  owner: string
  name: string
  version: string
  endpoint: string
  metadataURI: string
  erc8004AgentId: number | string
  registeredAt: number
  totalJobs: number
  averageScore: number
  tier: 'FREE' | 'BASIC' | 'PRO'
  tierPaidUntil?: number
  active?: boolean
}

interface RawStatsResponse {
  totalSkills?: number
  totalJobs?: number
  avgReputationScore?: number
  // allow through fields that already match the Stats type
  totalJobsExecuted?: number
  averageReputationScore?: number
}

function normalizeSkill(raw: RawSkillRecord): Skill {
  return {
    id: String(raw.skillId),
    name: raw.name,
    version: raw.version,
    endpoint: raw.endpoint,
    metadataURI: raw.metadataURI,
    owner: raw.owner,
    pricePerCall: '0',
    acceptedToken: 'USDC',
    reputationScore: raw.averageScore ?? 0,
    jobCount: raw.totalJobs ?? 0,
    tier: raw.tier ?? 'FREE',
    agentId: String(raw.erc8004AgentId ?? ''),
    description: '',
    tags: [],
    createdAt:
      raw.registeredAt
        ? new Date(raw.registeredAt * 1000).toISOString()
        : new Date().toISOString(),
    reputationHistory: [],
  }
}

function normalizeStats(raw: RawStatsResponse): Stats {
  return {
    totalSkills: raw.totalSkills ?? 0,
    // indexer sends totalJobs; guard against both field names
    totalJobsExecuted: raw.totalJobsExecuted ?? raw.totalJobs ?? 0,
    // indexer sends avgReputationScore; guard against both field names
    averageReputationScore: raw.averageReputationScore ?? raw.avgReputationScore ?? 0,
  }
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_BAZAAR_API ?? ''

async function apiFetch<T>(path: string): Promise<T> {
  if (!API_BASE) throw new Error('NEXT_PUBLIC_BAZAAR_API not set')
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useBazaarData() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [isMockData, setIsMockData] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadSkills = useCallback(async () => {
    try {
      // Indexer wraps skills in { skills: [...], total: N }
      const raw = await apiFetch<{ skills?: RawSkillRecord[] } | RawSkillRecord[]>('/skills')
      const records: RawSkillRecord[] = Array.isArray(raw)
        ? raw
        : ((raw as { skills?: RawSkillRecord[] }).skills ?? [])
      setSkills(records.map(normalizeSkill))
      setIsMockData(false)
    } catch {
      setSkills(MOCK_SKILLS)
      setIsMockData(true)
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const raw = await apiFetch<RawStatsResponse>('/stats')
      setStats(normalizeStats(raw))
    } catch {
      setStats(MOCK_STATS)
    }
  }, [])

  const loadJobs = useCallback(async () => {
    try {
      const raw = await apiFetch<Job[]>('/jobs')
      setJobs(Array.isArray(raw) ? raw : [])
    } catch {
      setJobs(MOCK_JOBS)
    }
  }, [])

  useEffect(() => {
    Promise.all([loadSkills(), loadStats(), loadJobs()]).finally(() =>
      setLoading(false)
    )

    const skillsInterval = setInterval(loadSkills, 15_000)
    const statsInterval = setInterval(loadStats, 30_000)
    const jobsInterval = setInterval(loadJobs, 15_000)

    return () => {
      clearInterval(skillsInterval)
      clearInterval(statsInterval)
      clearInterval(jobsInterval)
    }
  }, [loadSkills, loadStats, loadJobs])

  return { skills, stats, jobs, isMockData, loading }
}
