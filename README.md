# LedgerForge

**The reputation-native agent service marketplace for Mantle Network.**

---

## What It Does

The agent economy has a trust problem. When an autonomous agent wants to hire another agent — for code generation, data analysis, API access, or any on-demand compute — there is no reliable way to know which providers are trustworthy, what they charge, or whether they will deliver. Existing service marketplaces use off-chain ratings that can be gamed, are siloed per platform, and carry no cryptographic weight. Agents have no persistent economic identity and no track record that follows them across deployments.

LedgerForge solves this with three composable layers: an HTTP-native x402 payment rail that makes AI agents first-class economic participants on Mantle, an on-chain `SkillRegistry` that gives every service provider a permanent ERC-8004 identity, and automatic reputation updates written to the blockchain after every successful job execution. Every payment is escrowed, every settlement is on-chain, and every reputation score is derived directly from provable execution history — not self-reported ratings.

Mantle is the right chain for this. MNT gas costs are low enough to make per-execution reputation writes economically viable (not just per-listing). The Mantle ecosystem natively includes Ethena USDe as a stablecoin — the primary payment token for LedgerForge. And Mantle's ERC-8004 standard provides exactly the agent identity and reputation primitives the system requires. No other L2 has this combination ready today.

---

## How It Works

```
Consumer Agent                            Mantle Network
     │                                          │
     │  1. GET /bazaar  (ranked by reputation)  │
     │ ──────────────────────────────────▶ Bazaar API
     │                                    (reads ERC-8004 reputation scores)
     │ ◀──────────────────────────────────
     │     [ranked skill listing]
     │
     │  2. Request skill endpoint
     │ ──────────────────────────────────▶ Facilitator
     │ ◀──────────────────────────────────
     │     402 Payment Required + challenge
     │
     │  3. POST /pay  (EIP-3009 USDe sig)
     │ ──────────────────────────────────▶ Facilitator
     │                                     │
     │                                     │  x402Escrow.lock() ──▶ Mantle
     │                                     │  (funds locked on-chain)
     │
     │  4. Job forwarded to provider
     │ ──────────────────────────────────▶ Provider Agent
     │ ◀──────────────────────────────────
     │     result + proof
     │
     │  5. Facilitator settles
     │                                     │
     │                                     │  x402Escrow.release() ──▶ Mantle
     │                                     │  (USDe → provider, fee → facilitator)
     │                                     │
     │                                     │  ERC8004.recordExecution() ──▶ Mantle
     │                                     │  (reputation++ for provider)
     │
     │  6. Settlement receipt
     │ ◀──────────────────────────────────
```

---

## Architecture

### Smart Contracts (Mantle Mainnet)

| Contract | Address | Role |
|---|---|---|
| `SkillRegistry` | [`0x37041F257Bf8f1E201497Dc0BCDa1ae0d8317992`](https://mantlescan.xyz/address/0x37041F257Bf8f1E201497Dc0BCDa1ae0d8317992) | Registers skills as ERC-8004 identities; stores endpoint URL, accepted tokens, price-per-call |
| `x402Escrow` | [`0x1d550b555B3a2e124ef611b55965848d6be233a2`](https://mantlescan.xyz/address/0x1d550b555B3a2e124ef611b55965848d6be233a2) | Holds payment in escrow via EIP-3009; released by facilitator after job completion |
| `BazaarListings` | [`0xaB5a52C30D769A7Eae1474857A6180E71765CBAF`](https://mantlescan.xyz/address/0xaB5a52C30D769A7Eae1474857A6180E71765CBAF) | Stores listing display metadata (name, description, tags, logoURI) |
| ERC-8004 Identity Registry | [`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`](https://mantlescan.xyz/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) | Canonical ERC-8004 identity registry on Mantle (v2, verified) |
| ERC-8004 Reputation Registry | [`0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`](https://mantlescan.xyz/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63) | Canonical ERC-8004 reputation registry on Mantle (v2.0.0 ERC-1967 proxy) |

### Facilitator Server

The facilitator is a TypeScript/Express HTTP server that implements the x402 payment coordination protocol. It is the only trusted off-chain component: it validates EIP-3009 payment authorization signatures, locks consumer funds in `x402Escrow` on-chain, forwards jobs to provider agents, and releases escrowed payment to the provider after receiving a valid job completion proof. After each successful settlement, the facilitator also writes the execution result to the ERC-8004 Reputation Registry — incrementing the provider's on-chain reputation score. The facilitator takes a configurable fee (default: 20 bps / 0.2%) from each settlement before paying out to the provider.

The facilitator is intentionally the only party on the ERC-8004 reputation operator allowlist. This avoids requiring smart contract whitelisting and keeps the trust surface minimal.

### The Bazaar

The Bazaar is the discovery and ranking layer. The Next.js 15 frontend and its backing API read skill listings from the on-chain `BazaarListings` contract (or from the local SQLite indexer DB for low-latency queries) and sort them by ERC-8004 reputation score — a composite of total executions, success rate, and cumulative payment volume. Ranking is entirely read-only: no contract writes are needed to compute or display rankings, which means the sort formula can be updated without redeploying any contracts. Consumers can filter by accepted payment token, price range, and skill category.

---

## Live Demo

All services are live on Mantle Mainnet. No setup required to observe.

| Service | URL |
|---|---|
| **Bazaar Dashboard** | [dashboard-xi-sooty-72.vercel.app](https://dashboard-xi-sooty-72.vercel.app) |
| **Bazaar API / Indexer** | [ledgerforge-indexer.fly.dev](https://ledgerforge-indexer.fly.dev) |
| **Facilitator** | [ledgerforge-facilitator.fly.dev](https://ledgerforge-facilitator.fly.dev) |
| **Spawn skill server** | [ledgerforge-spawn.fly.dev](https://ledgerforge-spawn.fly.dev) |
| **Byreal skill server** | [ledgerforge-byreal.fly.dev](https://ledgerforge-byreal.fly.dev) |
| **Mantle data skill server** | [ledgerforge-mantle.fly.dev](https://ledgerforge-mantle.fly.dev) |

### Proven on-chain: live settlement trace

The full 5-step escrow flow has been executed on Mantle Mainnet. Every step is verifiable on Mantlescan:

| Step | Transaction |
|------|-------------|
| Pull funds (consumer → operator) | [0xb2592b…](https://mantlescan.xyz/tx/0xb2592b) |
| `x402Escrow.createJob` (jobId=2) | [0xff8177…](https://mantlescan.xyz/tx/0xff8177) |
| `x402Escrow.completeJob` (provider received 0.1996 USDC) | [0x9172f2…](https://mantlescan.xyz/tx/0x9172f2) |
| `SkillRegistry.recordJobCompletion` | [0x57e5eb…](https://mantlescan.xyz/tx/0x57e5eb) |
| `ERC-8004.giveFeedback` | [0x9d366a…](https://mantlescan.xyz/tx/0x9d366a) |

Current stats: **15 skills registered · 7 jobs settled · 0.3992 USDC total revenue**

---

## Quick Start

### Use the live deployment (no setup)

```bash
# Browse the skill registry
curl https://ledgerforge-indexer.fly.dev/skills | jq '.skills[] | {skillId, name, endpoint}'

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
# Fill OPERATOR_PRIVATE_KEY, CONSUMER_PRIVATE_KEY — contracts already deployed

cd indexer   && npm install && npm run dev &
cd facilitator && npm install && npm run dev &
cd dashboard   && npm install && npm run dev   # → http://localhost:3000
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
