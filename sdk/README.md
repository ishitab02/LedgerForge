# @ledgerforge/x402-mantle

TypeScript SDK for the LedgerForge x402 payment rail on Mantle Network. Discover skills, pay for them with USDC/USDe via EIP-712, and execute the resulting access-token call — all in a few lines.

```bash
npm install @ledgerforge/x402-mantle viem
```

## Quickstart

```ts
import { LedgerForgeClient } from "@ledgerforge/x402-mantle";

const client = new LedgerForgeClient({
  privateKey: "0x..." // your wallet's private key on Mantle (see Onboarding below)
});

// 0. One-time setup: approve the operator to spend USDC
await client.approveOperator("USDC");

// 1. Discovery
const skills = await client.listSkills({ search: "byreal" });

// 2. Pay + execute in one call
const result = await client.invoke(skills[0].skillId, {
  query: { sortField: "apr24h", pageSize: 5 },
});

console.log(result.output);            // skill response
console.log(result.receipt.explorerUrl); // on-chain settlement tx
```

## Onboarding — getting set up to pay for skills

The SDK signs payments with a Mantle wallet you own. There's no "LedgerForge account" to sign up for. You need three things:

**1. A wallet private key on Mantle**

Any EVM wallet works — chainId 5000, gas token is MNT.

- *Existing wallet (MetaMask, Rabby, etc.)*: export the private key from your wallet's account settings. **Use a dedicated wallet for agent payments**, never your main wallet.
- *Fresh wallet for an autonomous agent*: generate one with viem:
  ```ts
  import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
  const privateKey = generatePrivateKey();
  console.log('Fund this address:', privateKeyToAccount(privateKey).address);
  ```
- *Custodial / KMS / Privy / Turnkey*: pass a pre-built viem `WalletClient` instead of `privateKey` — see [Configuration](#configuration).

**2. Fund it with MNT (gas) + USDC (skill payments)**

You need both:
- ~$0.50 of **MNT** for gas (covers many calls)
- Some **USDC** on Mantle for skill fees (typical skill costs $0.05–$0.50)

How to get them onto Mantle:
- **Mantle Bridge** (https://app.mantle.xyz/bridge) — bridge USDC/MNT from Ethereum mainnet
- **Bybit / OKX / MEXC** — withdraw directly to Mantle network from a CEX
- **Swap on Merchant Moe / Agni** — if you already have MNT, swap to USDC

**3. Approve the operator to spend your USDC (one time, per token)**

The facilitator settles with `transferFrom`, so your wallet must pre-approve the operator address. The SDK has a helper:

```ts
await client.approveOperator("USDC");          // unlimited approval (most common)
await client.approveOperator("USDC", 5_000000n); // or limit to 5 USDC
```

You can also do this manually via the USDC contract on mantlescan:
- Contract: [`0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`](https://mantlescan.xyz/address/0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9)
- Function: `approve(spender, amount)`
- Spender: `0xC0296012Cfbb0e6DF5dA7158B65Dbc46DD9650e0` (operator)

Once approved, `invoke()` works repeatedly without further approvals until the allowance runs out.

> **Note for browser apps / dashboards**: the LedgerForge dashboard uses MetaMask directly — users don't need a private key, they sign in their wallet popup. The SDK is for programmatic / agent consumers. Use `walletClient` injection if you need to bridge a browser EIP-1193 provider.

## What it does

LedgerForge turns HTTP endpoints into pay-per-call agent services. Behind every skill call is:

1. **Discovery** — read the on-chain `SkillRegistry` via the LedgerForge bazaar API
2. **Challenge** — `GET /payment-details` returns an x402 challenge specifying token, amount, recipient
3. **Sign** — produce an EIP-712 typed-data signature authorizing the transfer
4. **Settle** — `POST /facilitate` validates the signature, calls `transferFrom` on Mantle, returns an access token
5. **Execute** — call the skill endpoint with `Authorization: Bearer settled:<tx>:<ts>`

The SDK collapses all five steps into `invoke()`, or exposes each one for inspection.

## Configuration

```ts
new LedgerForgeClient({
  // Where to find skills + facilitator (defaults: Mantle mainnet deployment)
  bazaarUrl: "https://ledgerforge-indexer.fly.dev",
  facilitatorUrl: "https://ledgerforge-facilitator.fly.dev",

  // Chain (defaults: Mantle mainnet)
  rpcUrl: "https://rpc.mantle.xyz",
  chainId: 5000,

  // Contracts (defaults: live mainnet addresses)
  skillRegistry: "0x37041F257Bf8f1E201497Dc0BCDa1ae0d8317992",
  operatorAddress: "0xC0296012Cfbb0e6DF5dA7158B65Dbc46DD9650e0",

  // Signing — pick ONE
  privateKey: "0x...",                  // most common
  account: privateKeyToAccount("0x..."), // pre-built viem account
  walletClient: myWalletClient,          // bring your own viem wallet
});
```

Defaults point at the production deployment, so the minimal config is just `{ privateKey }`.

## API

### Discovery

```ts
client.listSkills({ tier: "PRO", minScore: 80, search: "byreal" }): Promise<SkillListing[]>
client.getSkill(skillId: number): Promise<SkillListing>
```

### Token approvals + balance

```ts
// Read state — no signer required if you pass an `owner` address
client.getBalance("USDC"): Promise<bigint>
client.getAllowance("USDC"): Promise<bigint>

// One-time setup; default amount is uint256-max
client.approveOperator("USDC", amount?: bigint | "max"): Promise<{ txHash, explorerUrl, approvedAmount }>
```

### Payment flow (low-level)

```ts
client.getPaymentChallenge(skillId, { resource?, amount?, asset? }): Promise<PaymentChallenge>
client.signPayment(challenge, { recipient, amount?, validForSeconds? }): Promise<PaymentProof>
client.facilitate(challenge, proof): Promise<SettlementReceipt>
client.callSkill(endpoint, accessToken, { method?, query?, body?, headers? }): Promise<T>
```

### One-shot

```ts
client.invoke<T>(skillId, {
  query?:   { ... },        // → URL query params
  body?:    { ... },        // → POST body (forces method: "POST")
  method?:  "GET" | "POST",
  headers?: { ... },

  recipient?:        Address,        // override (defaults to skill.owner)
  token?:            "USDC" | "USDe" | Address,
  amount?:           bigint | string | number, // base units, or "0.5" decimal string
  validForSeconds?:  number,         // default 300
}): Promise<InvokeResult<T>>
```

### Helpers

```ts
import {
  DEFAULTS,                 // Mantle mainnet addresses + URLs
  formatTokenAmount,        // base units → "1.23"
  checksumAddress,          // EIP-55
  explorerTxUrl,            // tx → mantlescan link
  LedgerForgeError,         // typed errors with .code
} from "@ledgerforge/x402-mantle";
```

## Examples

The repo ships a runnable quickstart:

```bash
git clone https://github.com/PoulavBhowmick03/ledgerforge
cd ledgerforge/sdk
npm install
npm run example
```

The example exercises discovery + signing against the live deployment with a throwaway key. To exercise the full `invoke()` flow, set `WALLET_PRIVATE_KEY=0x...` to a Mantle wallet holding USDC (see [Onboarding](#onboarding--getting-set-up-to-pay-for-skills)). The example auto-approves the operator if your allowance is too low.

## Errors

All SDK errors are `LedgerForgeError` instances with a stable `.code`:

| code | meaning |
|---|---|
| `NO_SIGNER` | tried to sign without `privateKey` / `account` / `walletClient` |
| `BAZAAR_ERROR` | indexer API returned non-2xx |
| `SKILL_NOT_FOUND` | `getSkill(id)` returned 404 |
| `FACILITATOR_ERROR` | `/payment-details` returned non-2xx |
| `SETTLEMENT_FAILED` | `/facilitate` rejected the proof or settlement reverted |
| `SKILL_CALL_FAILED` | skill endpoint returned non-2xx |

## Live infrastructure

- **Bazaar API:** https://ledgerforge-indexer.fly.dev
- **Facilitator:** https://ledgerforge-facilitator.fly.dev
- **Dashboard:** https://dashboard-xi-sooty-72.vercel.app

Contract addresses (Mantle mainnet, chainId 5000):

- `SkillRegistry`: [`0x37041F257Bf8f1E201497Dc0BCDa1ae0d8317992`](https://mantlescan.xyz/address/0x37041F257Bf8f1E201497Dc0BCDa1ae0d8317992)
- `x402Escrow`: [`0x1d550b555B3a2e124ef611b55965848d6be233a2`](https://mantlescan.xyz/address/0x1d550b555B3a2e124ef611b55965848d6be233a2)
- `BazaarListings`: [`0xaB5a52C30D769A7Eae1474857A6180E71765CBAF`](https://mantlescan.xyz/address/0xaB5a52C30D769A7Eae1474857A6180E71765CBAF)

## License

MIT
