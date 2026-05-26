export type Tier = 'FREE' | 'BASIC' | 'PRO'
export type AcceptedToken = 'USDC' | 'USDe'

export interface Skill {
  id: string
  name: string
  version: string
  endpoint: string
  metadataURI: string
  owner: string
  pricePerCall: string
  acceptedToken: AcceptedToken
  reputationScore: number
  jobCount: number
  tier: Tier
  agentId: string
  description: string
  tags: string[]
  createdAt: string
  reputationHistory: ReputationPoint[]
}

export interface ReputationPoint {
  timestamp: string
  score: number
  jobId: string
}

export interface Stats {
  totalSkills: number
  totalJobsExecuted: number
  averageReputationScore: number
}

export interface Job {
  id: string
  skillId: string
  skillName: string
  consumer: string
  reputationScore: number
  settlementTx: string
  timestamp: string
}

export type SortKey = 'reputation' | 'jobs' | 'newest'
export type FilterTier = 'ALL' | Tier
