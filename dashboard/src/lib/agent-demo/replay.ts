// Replay orchestrator: emits the same AgentEvent stream as runner.ts but
// reads its data from the indexer's /jobs API instead of making real
// payments. Designed for judges who don't have a Mantle wallet.

import type { AgentEvent, SettlementSummary } from './events'
import type { AgentSpec } from './specs'

const BAZAAR_API =
  process.env.NEXT_PUBLIC_BAZAAR_API ?? 'https://ledgerforge-indexer.fly.dev'

interface JobRecord {
  jobId: string
  skillId: string
  skillName: string
  consumer: string
  provider: string
  settlementTx: string
  createJobTx?: string
  completeJobTx?: string
  amount: string
  feeAmount: string
  token: 'USDC' | 'USDe'
  blockNumber: number
  timestamp: string
  confirmed: boolean
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Async iterable that mirrors runner.runLive but with simulated pacing. */
export async function* runReplay<T>(
  spec: AgentSpec<T>,
  opts: { stepDelayMs?: number } = {},
): AsyncIterable<AgentEvent> {
  const stepDelay = opts.stepDelayMs ?? 1500
  const pinned = spec.pinnedReplayJobIds ?? []
  if (pinned.length === 0) {
    yield {
      type: 'aborted',
      reason:
        'No pinned replay run for this agent yet — try the live mode (Run with MetaMask).',
    }
    return
  }

  yield { type: 'started' }

  // Fetch all candidate jobs once. /jobs returns most-recent-first.
  let allJobs: JobRecord[]
  try {
    const res = await fetch(`${BAZAAR_API}/jobs?limit=500`)
    if (!res.ok) throw new Error(`indexer /jobs returned ${res.status}`)
    allJobs = (await res.json()) as JobRecord[]
  } catch (err) {
    yield {
      type: 'aborted',
      reason: `Failed to load historical run: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
    return
  }

  const jobsByJobId = new Map<string, JobRecord>()
  for (const job of allJobs) jobsByJobId.set(String(job.jobId), job)

  const settlements: SettlementSummary[] = []
  const outputs: unknown[] = new Array(spec.steps.length).fill(undefined)

  // Walk steps in spec order, matching pinned jobIds by index. Steps with no
  // matching jobId (e.g. swap-preview when the run didn't enter the pool) are
  // emitted as skipped.
  for (let i = 0; i < spec.steps.length; i++) {
    const pinnedJobId = pinned[i]
    if (pinnedJobId === undefined) {
      yield {
        type: 'step-skipped',
        stepIndex: i,
        reason: 'no historical settlement pinned for this step',
      }
      continue
    }

    yield { type: 'step-running', stepIndex: i }
    await sleep(stepDelay)

    const job = jobsByJobId.get(String(pinnedJobId))
    if (!job) {
      yield {
        type: 'step-failed',
        stepIndex: i,
        error: `pinned jobId ${pinnedJobId} not found in /jobs response`,
      }
      continue
    }

    const settlement: SettlementSummary = {
      skillId: spec.steps[i].skillId,
      skillName: spec.steps[i].label,
      jobId: job.jobId,
      pullTx: undefined, // /jobs only surfaces createJob + completeJob today
      createJobTx: job.createJobTx as `0x${string}` | undefined,
      completeJobTx: (job.completeJobTx || job.settlementTx) as `0x${string}` | undefined,
      // Reputation tx hashes aren't in /jobs payload — accept undefined.
      skillRegistryRepTx: undefined,
      erc8004FeedbackTx: undefined,
      explorerUrl: `https://mantlescan.xyz/tx/${job.completeJobTx || job.settlementTx}`,
    }
    settlements.push(settlement)
    // Replay can't reconstruct the skill's raw output JSON since the indexer
    // doesn't store it. Decision rendering after a replay run shows the
    // ENTER_POOL/STAY label with reasoning derived from spec-level hints in
    // the future; for v1 we just synthesize a stub so the UI can render
    // "decision: REPLAY — see live mode for full decision logic".
    outputs[i] = { __replay: true }

    yield {
      type: 'step-settled',
      stepIndex: i,
      settlement,
      output: outputs[i],
    }
  }

  // Synthesize a placeholder decision — the real `decide()` needs the live
  // skill outputs which we don't have. Replay mode emphasises the on-chain
  // proof; for the decision rationale, point the user at live mode.
  yield {
    type: 'decision',
    decision: {
      action: 'REPLAY',
      reason:
        'Replay mode shows historical on-chain settlements. Run live with MetaMask to see the agent\'s decision logic on fresh market data.',
      confidence: 100,
    },
  }

  yield {
    type: 'completed',
    totalSpent: spec.pricePerCall * BigInt(settlements.length),
    settlements,
  }
}
