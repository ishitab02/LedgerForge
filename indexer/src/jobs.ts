import { existsSync, readFileSync, writeFileSync } from "fs";
import {
  formatUnits,
  getAddress,
  isAddress,
  parseAbiItem,
  type Log,
} from "viem";
import { publicClient } from "./config.js";
import { loadDb, type BazaarTier, type SkillRecord } from "./db.js";

export interface JobRecord {
  id: string;
  skillId: string;
  skillName: string;
  skillTier: BazaarTier;
  consumer: string;
  score: number;
  settlementTx: string;
  amount: string;
  feeAmount: string;
  token: "USDC" | "USDe";
  blockNumber: number;
  timestamp: string;
  confirmed: boolean;
  provider: string;
}

const JOBS_DB_PATH = process.env.JOBS_DB_PATH ?? "./jobs_db.json";

// ERC-20 Transfer event
const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

interface TokenSpec {
  address: `0x${string}`;
  symbol: "USDC" | "USDe";
  decimals: number;
}

function getTokens(): TokenSpec[] {
  const tokens: TokenSpec[] = [];
  const usdc = process.env.USDC_ADDRESS;
  const usde = process.env.USDE_ADDRESS;
  if (usdc && isAddress(usdc)) {
    tokens.push({ address: usdc as `0x${string}`, symbol: "USDC", decimals: 6 });
  }
  if (usde && isAddress(usde)) {
    tokens.push({ address: usde as `0x${string}`, symbol: "USDe", decimals: 18 });
  }
  return tokens;
}

function getOperator(): `0x${string}` | null {
  const op = process.env.OPERATOR_ADDRESS;
  if (op && isAddress(op)) return op as `0x${string}`;
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

function findSkillByProvider(
  providerAddress: string,
  skills: Record<number, SkillRecord>,
): SkillRecord | null {
  const target = providerAddress.toLowerCase();
  // Pick the most-recently-registered active skill owned by this address
  const matches = Object.values(skills).filter(
    (s) => s.owner.toLowerCase() === target,
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.registeredAt - a.registeredAt);
  return matches[0];
}

type TransferLog = Log<bigint, number, false, typeof TRANSFER_EVENT, true>;

interface TransferDetails {
  txHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  token: TokenSpec;
}

function logToTransfer(log: TransferLog, token: TokenSpec): TransferDetails | null {
  const args = log.args;
  if (!args.from || !args.to || args.value === undefined) return null;
  if (!log.transactionHash || log.blockNumber === null || log.logIndex === null) {
    return null;
  }
  return {
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.logIndex,
    from: args.from,
    to: args.to,
    value: args.value,
    token,
  };
}

const BLOCK_LOOKBACK = BigInt(process.env.JOBS_BLOCK_LOOKBACK ?? "10000");
const MAX_BLOCK_RANGE_PER_CALL = BigInt(
  process.env.JOBS_MAX_RANGE_PER_CALL ?? "2000",
);

async function fetchOperatorTransfers(
  token: TokenSpec,
  operator: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<TransferDetails[]> {
  const results: TransferDetails[] = [];
  let cursor = fromBlock;
  while (cursor <= toBlock) {
    const end =
      cursor + MAX_BLOCK_RANGE_PER_CALL - 1n > toBlock
        ? toBlock
        : cursor + MAX_BLOCK_RANGE_PER_CALL - 1n;
    try {
      const logs = (await publicClient.getLogs({
        address: token.address,
        event: TRANSFER_EVENT,
        args: { to: operator },
        fromBlock: cursor,
        toBlock: end,
      })) as TransferLog[];
      for (const log of logs) {
        const t = logToTransfer(log, token);
        if (t) results.push(t);
      }
    } catch (err) {
      console.warn(
        `[Jobs] getLogs failed for ${token.symbol} ${cursor}-${end}:`,
        (err as Error).message,
      );
    }
    cursor = end + 1n;
  }
  return results;
}

async function fetchAllTokenTransfersInTx(
  token: TokenSpec,
  txHash: `0x${string}`,
  blockNumber: bigint,
): Promise<TransferDetails[]> {
  try {
    const logs = (await publicClient.getLogs({
      address: token.address,
      event: TRANSFER_EVENT,
      fromBlock: blockNumber,
      toBlock: blockNumber,
    })) as TransferLog[];
    return logs
      .filter((l) => l.transactionHash === txHash)
      .map((l) => logToTransfer(l, token))
      .filter((t): t is TransferDetails => t !== null);
  } catch (err) {
    console.warn(
      `[Jobs] tx-scope getLogs failed for ${token.symbol} block ${blockNumber}:`,
      (err as Error).message,
    );
    return [];
  }
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

export async function scanJobs(): Promise<JobRecord[]> {
  const operator = getOperator();
  const tokens = getTokens();
  if (!operator || tokens.length === 0) {
    return [];
  }

  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock =
    latestBlock > BLOCK_LOOKBACK ? latestBlock - BLOCK_LOOKBACK : 0n;

  const existing = loadJobsDb();
  const seen = new Set(existing.map((j) => j.id));
  const newJobs: JobRecord[] = [];

  const skills = loadDb();

  for (const token of tokens) {
    const feeTransfers = await fetchOperatorTransfers(
      token,
      operator,
      fromBlock,
      latestBlock,
    );

    for (const fee of feeTransfers) {
      const id = `${fee.txHash}-${fee.logIndex}`;
      if (seen.has(id)) continue;

      // Pull all token transfers in this tx and find the non-operator leg (the
      // provider payment).
      const txTransfers = await fetchAllTokenTransfersInTx(
        token,
        fee.txHash,
        fee.blockNumber,
      );
      const providerTransfer = txTransfers.find(
        (t) =>
          t.logIndex !== fee.logIndex &&
          t.to.toLowerCase() !== operator.toLowerCase(),
      );
      if (!providerTransfer) {
        // Not a recognizable settlement (no second leg); skip
        continue;
      }

      const ts = await getBlockTimestamp(fee.blockNumber);
      const skillRecord = findSkillByProvider(providerTransfer.to, skills);

      const job: JobRecord = {
        id,
        skillId: skillRecord ? String(skillRecord.skillId) : "",
        skillName: skillRecord ? skillRecord.name : "unknown-skill",
        skillTier: skillRecord ? skillRecord.tier : "FREE",
        consumer: getAddress(fee.from),
        score: skillRecord ? skillRecord.averageScore : 0,
        settlementTx: fee.txHash,
        amount: formatUnits(providerTransfer.value, token.decimals),
        feeAmount: formatUnits(fee.value, token.decimals),
        token: token.symbol,
        blockNumber: Number(fee.blockNumber),
        timestamp: new Date(ts * 1000).toISOString(),
        confirmed: true,
        provider: getAddress(providerTransfer.to),
      };

      newJobs.push(job);
      seen.add(id);
    }
  }

  if (newJobs.length > 0) {
    const merged = [...existing, ...newJobs];
    // Keep at most 1000 most-recent jobs (by timestamp desc)
    merged.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const trimmed = merged.slice(0, 1000);
    saveJobsDb(trimmed);
    console.log(`[Jobs] Indexed ${newJobs.length} new job(s); total=${trimmed.length}`);
    return trimmed;
  }

  return existing;
}

export async function pollJobs(): Promise<void> {
  try {
    await scanJobs();
  } catch (err) {
    console.error("[Jobs] poll error:", (err as Error).message);
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
