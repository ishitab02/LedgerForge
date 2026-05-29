import { existsSync, readFileSync, writeFileSync } from "fs";
import {
  decodeEventLog,
  formatUnits,
  getAddress,
  isAddress,
  parseAbiItem,
  type Hex,
  type Log,
} from "viem";
import { publicClient } from "./config.js";
import { loadDb, type BazaarTier, type SkillRecord } from "./db.js";

export interface JobRecord {
  id: string;
  jobId: string;
  skillId: string;
  skillName: string;
  skillTier: BazaarTier;
  consumer: string;
  score: number;
  settlementTx: string;
  createJobTx: string;
  completeJobTx: string;
  amount: string;
  feeAmount: string;
  token: "USDC" | "USDe";
  blockNumber: number;
  timestamp: string;
  confirmed: boolean;
  provider: string;
}

const JOBS_DB_PATH = process.env.JOBS_DB_PATH ?? "./jobs_db.json";

const JOB_CREATED_EVENT = parseAbiItem(
  "event JobCreated(uint256 indexed jobId, address indexed consumer, address indexed provider, uint256 skillId, uint256 amount, address token)",
);
const JOB_COMPLETED_EVENT = parseAbiItem(
  "event JobCompleted(uint256 indexed jobId, uint256 paidToProvider, uint256 fee)",
);

const ESCROW_JOB_GETTER_ABI = [
  {
    name: "getJob",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "jobId",              type: "uint256" },
        { name: "consumer",           type: "address" },
        { name: "provider",           type: "address" },
        { name: "token",              type: "address" },
        { name: "amount",             type: "uint256" },
        { name: "skillId",            type: "uint256" },
        { name: "jobSpecURI",         type: "string"  },
        { name: "status",             type: "uint8"   },
        { name: "createdAt",          type: "uint256" },
        { name: "completedAt",        type: "uint256" },
        { name: "disputeWindow",      type: "uint256" },
        { name: "facilitatorFeeBps", type: "uint256" },
      ],
    }],
  },
] as const;

const KNOWN_TOKENS: Record<string, { symbol: "USDC" | "USDe"; decimals: number }> = {};
function ingestTokens(): void {
  const usdc = process.env.USDC_ADDRESS;
  const usde = process.env.USDE_ADDRESS;
  if (usdc && isAddress(usdc)) KNOWN_TOKENS[usdc.toLowerCase()] = { symbol: "USDC", decimals: 6 };
  if (usde && isAddress(usde)) KNOWN_TOKENS[usde.toLowerCase()] = { symbol: "USDe", decimals: 18 };
}
ingestTokens();

function tokenInfo(addr: string): { symbol: "USDC" | "USDe"; decimals: number } | null {
  return KNOWN_TOKENS[addr.toLowerCase()] ?? null;
}

function getEscrowAddress(): `0x${string}` | null {
  const a = process.env.X402_ESCROW_ADDRESS;
  if (a && isAddress(a)) return a as `0x${string}`;
  return null;
}

export function loadJobsDb(): JobRecord[] {
  if (!existsSync(JOBS_DB_PATH)) return [];
  try {
    return JSON.parse(readFileSync(JOBS_DB_PATH, "utf-8")) as JobRecord[];
  } catch {
    return [];
  }
}

export function saveJobsDb(jobs: JobRecord[]): void {
  writeFileSync(JOBS_DB_PATH, JSON.stringify(jobs, null, 2));
}

function findSkill(
  skillId: bigint,
  provider: string,
  skills: Record<number, SkillRecord>,
): SkillRecord | null {
  const byId = skills[Number(skillId)];
  if (byId) return byId;
  // fallback to latest skill for this provider
  const matches = Object.values(skills).filter(
    (s) => s.owner.toLowerCase() === provider.toLowerCase(),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.registeredAt - a.registeredAt);
  return matches[0];
}

const CONSUMER_FROM_URI_RE = /\/consumer\/(0x[0-9a-fA-F]{40})\//;
function parseConsumerFromURI(uri: string): string | null {
  const m = uri.match(CONSUMER_FROM_URI_RE);
  return m ? m[1] : null;
}

const BLOCK_LOOKBACK = BigInt(process.env.JOBS_BLOCK_LOOKBACK ?? "20000");
const MAX_BLOCK_RANGE_PER_CALL = BigInt(
  process.env.JOBS_MAX_RANGE_PER_CALL ?? "2000",
);

async function fetchEscrowJobCreated(
  escrow: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<Log[]> {
  const out: Log[] = [];
  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const end =
      cursor + MAX_BLOCK_RANGE_PER_CALL - 1n > toBlock
        ? toBlock
        : cursor + MAX_BLOCK_RANGE_PER_CALL - 1n;
    try {
      const logs = await publicClient.getLogs({
        address: escrow,
        event: JOB_CREATED_EVENT,
        fromBlock: cursor,
        toBlock: end,
      });
      out.push(...(logs as Log[]));
    } catch (err) {
      console.warn(`job created logs ${cursor}-${end}:`, (err as Error).message);
    }
    cursor = end + 1n;
  }
  return out;
}

async function fetchEscrowJobCompleted(
  escrow: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<Log[]> {
  const out: Log[] = [];
  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const end =
      cursor + MAX_BLOCK_RANGE_PER_CALL - 1n > toBlock
        ? toBlock
        : cursor + MAX_BLOCK_RANGE_PER_CALL - 1n;
    try {
      const logs = await publicClient.getLogs({
        address: escrow,
        event: JOB_COMPLETED_EVENT,
        fromBlock: cursor,
        toBlock: end,
      });
      out.push(...(logs as Log[]));
    } catch (err) {
      console.warn(`job completed logs ${cursor}-${end}:`, (err as Error).message);
    }
    cursor = end + 1n;
  }
  return out;
}

const blockTimestampCache = new Map<string, number>();
async function getBlockTimestamp(blockNumber: bigint): Promise<number> {
  const key = blockNumber.toString();
  const cached = blockTimestampCache.get(key);
  if (cached !== undefined) return cached;
  try {
    const block = await publicClient.getBlock({ blockNumber });
    const ts = Number(block.timestamp);
    blockTimestampCache.set(key, ts);
    return ts;
  } catch {
    return Math.floor(Date.now() / 1000);
  }
}

interface JobCreatedDecoded {
  jobId: bigint;
  consumer: `0x${string}`;
  provider: `0x${string}`;
  skillId: bigint;
  amount: bigint;
  token: `0x${string}`;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

interface JobCompletedDecoded {
  jobId: bigint;
  paidToProvider: bigint;
  fee: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

function decodeJobCreated(log: Log): JobCreatedDecoded | null {
  try {
    const d = decodeEventLog({ abi: [JOB_CREATED_EVENT], data: log.data, topics: log.topics });
    if (d.eventName !== "JobCreated" || !log.transactionHash || log.blockNumber === null) return null;
    const a = d.args as unknown as {
      jobId: bigint; consumer: `0x${string}`; provider: `0x${string}`;
      skillId: bigint; amount: bigint; token: `0x${string}`;
    };
    return {
      jobId: a.jobId, consumer: a.consumer, provider: a.provider,
      skillId: a.skillId, amount: a.amount, token: a.token,
      txHash: log.transactionHash, blockNumber: log.blockNumber,
    };
  } catch { return null; }
}

function decodeJobCompleted(log: Log): JobCompletedDecoded | null {
  try {
    const d = decodeEventLog({ abi: [JOB_COMPLETED_EVENT], data: log.data, topics: log.topics });
    if (d.eventName !== "JobCompleted" || !log.transactionHash || log.blockNumber === null) return null;
    const a = d.args as unknown as { jobId: bigint; paidToProvider: bigint; fee: bigint };
    return {
      jobId: a.jobId, paidToProvider: a.paidToProvider, fee: a.fee,
      txHash: log.transactionHash, blockNumber: log.blockNumber,
    };
  } catch { return null; }
}

export async function scanJobs(): Promise<JobRecord[]> {
  const escrow = getEscrowAddress();
  if (!escrow) {
    return [];
  }

  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock > BLOCK_LOOKBACK ? latestBlock - BLOCK_LOOKBACK : 0n;

  const existing = loadJobsDb();
  const seen = new Set(existing.map((j) => j.id));
  const skills = loadDb();

  const [createdLogs, completedLogs] = await Promise.all([
    fetchEscrowJobCreated(escrow, fromBlock, latestBlock),
    fetchEscrowJobCompleted(escrow, fromBlock, latestBlock),
  ]);

  const completedByJobId = new Map<string, JobCompletedDecoded>();
  for (const log of completedLogs) {
    const d = decodeJobCompleted(log);
    if (d) completedByJobId.set(d.jobId.toString(), d);
  }

  const newJobs: JobRecord[] = [];

  for (const log of createdLogs) {
    const created = decodeJobCreated(log);
    if (!created) continue;

    const id = `${created.txHash}-${created.jobId}`;
    if (seen.has(id)) continue;

    const completed = completedByJobId.get(created.jobId.toString());

    const tokenMeta = tokenInfo(created.token);
    if (!tokenMeta) continue;

    // prefer the consumer encoded by settler
    let realConsumer = created.consumer;
    try {
      const job = await publicClient.readContract({
        address: escrow,
        abi: ESCROW_JOB_GETTER_ABI,
        functionName: "getJob",
        args: [created.jobId],
      });
      const fromURI = parseConsumerFromURI(job.jobSpecURI);
      if (fromURI && isAddress(fromURI)) {
        realConsumer = getAddress(fromURI) as `0x${string}`;
      }
    } catch { /* keep on-chain consumer */ }

    const ts = await getBlockTimestamp(created.blockNumber);
    const skillRecord = findSkill(created.skillId, created.provider, skills);

    const totalAmount = created.amount;
    const fee = completed?.fee ?? 0n;
    const paidToProvider = completed?.paidToProvider ?? (totalAmount - fee);

    const job: JobRecord = {
      id,
      jobId: created.jobId.toString(),
      skillId: created.skillId.toString(),
      skillName: skillRecord ? skillRecord.name : "unknown-skill",
      skillTier: skillRecord ? skillRecord.tier : "FREE",
      consumer: getAddress(realConsumer),
      score: skillRecord ? skillRecord.averageScore : 0,
      settlementTx: completed ? completed.txHash : created.txHash,
      createJobTx: created.txHash,
      completeJobTx: completed ? completed.txHash : "",
      amount: formatUnits(paidToProvider, tokenMeta.decimals),
      feeAmount: formatUnits(fee, tokenMeta.decimals),
      token: tokenMeta.symbol,
      blockNumber: Number((completed ?? created).blockNumber),
      timestamp: new Date(ts * 1000).toISOString(),
      confirmed: !!completed,
      provider: getAddress(created.provider),
    };

    newJobs.push(job);
    seen.add(id);
  }

  if (newJobs.length > 0) {
    const merged = [...existing, ...newJobs];
    merged.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const trimmed = merged.slice(0, 1000);
    saveJobsDb(trimmed);
    console.log(`indexed ${newJobs.length} jobs total=${trimmed.length}`);
    return trimmed;
  }

  return existing;
}

export async function pollJobs(): Promise<void> {
  try {
    await scanJobs();
  } catch (err) {
    console.error("job poll error:", (err as Error).message);
  }
}

export function getJobs(limit = 100): JobRecord[] {
  const jobs = loadJobsDb();
  jobs.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  return jobs.slice(0, Math.max(0, limit));
}
