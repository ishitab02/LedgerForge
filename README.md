# LedgerForge

LedgerForge is a Mantle-native marketplace for agent skills.

## Workspaces

- `contracts`
- `facilitator`
- `indexer`
- `dashboard`
- `sdk`
- `agents`

## Status

Project scaffold in progress.

# Check live job settlements
curl https://ledgerforge-indexer.fly.dev/jobs | jq '.[0]'

# Get payment details for a skill
curl "https://ledgerforge-facilitator.fly.dev/payment-details?skillId=11&amount=200000"

# Call a skill directly (simulated payment token)
curl "https://ledgerforge-mantle.fly.dev/mantle-tvl-monitor" \
  -H "Authorization: Bearer settled:0xyourtxhash:$(date +%s)"
```

### SDK usage

```bash
npm install @ledgerforge/x402-mantle
```

```typescript
import { LedgerForgeClient } from '@ledgerforge/x402-mantle'

const client = new LedgerForgeClient({
  facilitatorUrl: 'https://ledgerforge-facilitator.fly.dev',
  bazaarApiUrl: 'https://ledgerforge-indexer.fly.dev',
  privateKey: process.env.CONSUMER_PRIVATE_KEY,
  rpcUrl: 'https://rpc.mantle.xyz',
})

// Browse and pay for a skill in one call
const result = await client.invokeSkill(11, { query: 'top Mantle protocols by TVL' })
console.log(result.data)           // live TVL from DeFiLlama
console.log(result.settlementTxHash) // on-chain proof
```

### Run the demo agents

LedgerForge ships **three independent autonomous agents** on the same SDK: different domains, different decision shapes, one rail. Each agent pays for multiple skills, leaves on-chain proof for every settlement, and writes a markdown + JSON digest.

| Agent | Domain | Skills called | Decision shape | Live run |
|---|---|---|---|---|
| **Scout** | DeFi yield rotation | byreal-top-pools, aave-v3-rates, token-price-feed, mantle-gas-oracle, byreal-swap-preview | `ENTER_POOL` / `STAY` (with confidence + reasoning) | `npm run scout` |
| **Perps Coach** | Byreal perps trading | byreal-perps-signals × N, token-price-feed, mantle-gas-oracle | Per-position: `HOLD` / `REDUCE` / `TAKE_PROFIT` / `AVOID` | `npm run perps-coach` |
| **Spawn Auditor** | AI deploy provenance / audit | spawn-failure-analyst, lineage-context-builder, decision-hash-verifier | `APPROVE` / `BLOCK` with rationale + remediations | `npm run spawn-auditor` |

Each has a free dry-run variant (e.g. `npm run scout:dry-run`) that exercises the full pipeline without broadcasting. `npm run demos:dry-run` runs all three in sequence as an end-to-end smoke test.

```bash
cd agents
npm run demos:dry-run          # all three agents, no on-chain settlements
npm run scout                  # live: ~0.25 USDC, 25 Mantle txs, writes a digest
npm run perps-coach            # live: scans 3 positions, recommends actions
npm run spawn-auditor          # live: audits a Spawn deployment, verdicts APPROVE/BLOCK
```

Outputs land in `agents/scout-runs/`, `agents/perps-coach-runs/`, and `agents/spawn-auditor-runs/`. Each run produces a markdown digest for review and a parallel JSON file for parsing. Demo-provider keys are kept in memory and printed to stderr only; they never touch disk.

#### Worked example: Scout

The Scout agent is the most illustrative end-to-end demo of the rail. In ~2 minutes it:

1. Calls `byreal-top-pools` (paid): top Byreal CLMM pools by 24h APR
2. Calls `aave-v3-rates` (paid): Aave V3 USDC supply APY on Mantle
3. Calls `token-price-feed` (paid): live USDC/USDe stablecoin prices
4. Calls `mantle-gas-oracle` (paid): current swap gas cost in USD
5. **Decides**: if (top pool APR - Aave supply APY) > 5pp and gas < $1, ENTER_POOL
6. If ENTER_POOL: calls `byreal-swap-preview` (paid), models the rotation, captures price impact

That's 5 settlements × 5 mainnet txs each = **25 verifiable on-chain transactions** to produce one rebalance recommendation. Every settlement appears in the digest with paste-able mantlescan links for both the escrow `completeJob` payout and the ERC-8004 `giveFeedback` reputation write.

**Configure thresholds** via env vars: `SCOUT_PRICE_PER_CALL`, `SCOUT_MIN_APR_DELTA_PCT`, `SCOUT_MAX_GAS_USD`. Each agent has its own equivalent env block; see `agents/src/<agent>.ts` for the full list.

### Run the multi-agent client simulator

```bash
cd agents
npm run simulate-clients   # five personas, infinite loop, round scorecard
```

### Local development

```bash
git clone https://github.com/PoulavBhowmick03/ledgerforge
cd ledgerforge
cp .env.example .env
# Fill OPERATOR_PRIVATE_KEY and CONSUMER_PRIVATE_KEY; contracts are already deployed

cd indexer   && npm install && npm run dev &
cd facilitator && npm install && npm run dev &
cd dashboard   && npm install && npm run dev   # -> http://localhost:3000
```

See [AGENTS.md](./AGENTS.md) for the full runbook, Makefile targets, and known gotchas.

---

## Deployed Contracts

| Contract | Address | Mantlescan |
|---|---|---|
| SkillRegistry | `0x37041F257Bf8f1E201497Dc0BCDa1ae0d8317992` | [View](https://mantlescan.xyz/address/0x37041F257Bf8f1E201497Dc0BCDa1ae0d8317992) |
| x402Escrow | `0x1d550b555B3a2e124ef611b55965848d6be233a2` | [View](https://mantlescan.xyz/address/0x1d550b555B3a2e124ef611b55965848d6be233a2) |
| BazaarListings | `0xaB5a52C30D769A7Eae1474857A6180E71765CBAF` | [View](https://mantlescan.xyz/address/0xaB5a52C30D769A7Eae1474857A6180E71765CBAF) |
| ERC-8004 Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | [View](https://mantlescan.xyz/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63) |
| ERC-8004 Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | [View](https://mantlescan.xyz/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) |
| Deployer / Operator | `0xC0296012Cfbb0e6DF5dA7158B65Dbc46DD9650e0` | [View](https://mantlescan.xyz/address/0xC0296012Cfbb0e6DF5dA7158B65Dbc46DD9650e0) |

---

## Tracks

| Track | Justification |
|---|---|
| **Agentic Wallets & Economy** (Byreal) | LedgerForge is payment infrastructure built specifically for autonomous agents: the x402 rail, EIP-3009 escrow, and per-execution stablecoin settlement are the core product — not a wrapper around an existing payment system |
| **AI DevTools** | The `@ledgerforge/x402-mantle` TypeScript SDK and the Bazaar discovery API are developer tools: any developer can register a skill and start monetizing an agent capability in under 10 minutes |

---

## Revenue Model

1. **Facilitator settlement fee** — 0.2% (20 basis points) taken from every settled job. Scales linearly with marketplace payment volume. No fees on failed or cancelled jobs.
2. **Listing fee** — Optional one-time MNT fee to register a skill in `BazaarListings`. Configurable per-deploy; set to zero for hackathon to bootstrap supply.
3. **Priority ranking boost** — Providers can stake MNT to boost their Bazaar ranking above the reputation-derived floor. Staking revenue goes to a DAO treasury (post-hackathon roadmap item).
4. **Hosted facilitator subscription** — Enterprise consumers using the `@ledgerforge/x402-mantle` SDK at high volume can subscribe to a rate-limited managed facilitator endpoint rather than self-hosting, paying a flat monthly fee.

---

## Team

| Name | Role |
|---|---|
| **Poulav Bhowmick** | Smart contracts, facilitator server, SDK |
| **Ishita** | Dashboard, agent integrations, design |
