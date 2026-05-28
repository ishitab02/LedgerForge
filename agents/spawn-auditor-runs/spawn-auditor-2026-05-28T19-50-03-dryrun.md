# LedgerForge Spawn Auditor - NEEDS_REVIEW (complete)

> **TL;DR**: an autonomous auditor paid 0 Spawn skills (0 USDC, 0 Mantle mainnet txs in 0s) and produced a **NEEDS_REVIEW** verdict with 45% confidence.

## Audit verdict

**NEEDS_REVIEW** - confidence 45%

> Audit inputs were incomplete because one or more paid skills failed or returned no verifier field.

| Signal | Value |
|---|---|
| Decision hash verified | unknown |
| Lineage context size | 0 chars |
| Post-mortems found | 0 |

## Remediation list

- Check partial-run failures in this digest.
- Re-run once the affected Spawn skill endpoint is healthy.

## Audit inputs

- **Lineage key:** `agent-demo-lineage`
- **Generation:** `2`
- **Contract:** [`0x37041F257Bf8f1E201497Dc0BCDa1ae0d8317992`](https://mantlescan.xyz/address/0x37041F257Bf8f1E201497Dc0BCDa1ae0d8317992)
- **Decision hash:** `0xdeadbeefdead...`

## On-chain settlement chain

Every paid read below was a real x402 micropayment on Mantle mainnet. Each settlement emits pull, escrow, completion, SkillRegistry reputation, and ERC-8004 feedback txs when all writes succeed.

_(dry-run - no settlements broadcast)_

---

## Run details

- **Started:** 2026-05-28T19:50:03.821Z
- **Finished:** 2026-05-28T19:50:04.071Z (0s elapsed)
- **Consumer:** [`0xC0296012Cfbb0e6DF5dA7158B65Dbc46DD9650e0`](https://mantlescan.xyz/address/0xC0296012Cfbb0e6DF5dA7158B65Dbc46DD9650e0)
- **Provider (recipient):** [`0x5c4AebED46EeFbD3856f6D37Db11E77a46893877`](https://mantlescan.xyz/address/0x5c4AebED46EeFbD3856f6D37Db11E77a46893877)
- **Provider source:** ephemeral
- **Mode:** dry-run
- **Price per call:** 0.05 USDC
- **Lineage key:** agent-demo-lineage
- **Decision hash:** 0xdeadbeefdead...

## Limitations

- Auditor only: this agent does not promote, deploy, or mutate Spawn contracts.
- Default hash is intentionally unknown, so demo runs usually produce NEEDS_REVIEW.
- ERC-8004 identity/reputation availability depends on the live Mantle registry state.
