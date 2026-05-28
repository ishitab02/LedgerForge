# LedgerForge — Demo Video Script (Option B: full pitch)

**Target length:** 3:50 — 4:00. Hard cap 4:00.
**One-take, screen-recorded.** No talking head, no music, no slide deck. The product carries the demo.
**Recording setup:**
- Terminal in iTerm at 18pt font, ~120×30, in `~/Developer/ledgerforge/agents/`
- Browser tabs preloaded in this order: `https://www.npmjs.com/package/@ledgerforge/x402-mantle`, `https://dashboard-xi-sooty-72.vercel.app`, `https://mantlescan.xyz/address/0x1d550b555B3a2e124ef611b55965848d6be233a2`, `https://mantlescan.xyz/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- Editor (VS Code) with Markdown preview, ready to open the latest `agents/scout-runs/scout-*.md`
- A snippet ready to paste/show: a short SDK code sample (see Shot 5)

The narration is written to be read straight from this page. Pauses are marked `[…]`. Total narration ≈ 470 words ≈ 3 minutes at conversational pace; the remaining minute is action/scrolling/clicks.

---

## Shot 1 — The vision hook (0:00 — 0:30)

**On screen:** terminal, clear, prompt visible. Or — if you can swing it — a blank-ish editor view of `agents/src/autonomous-scout.ts` zoomed out so the structure reads as "this is a real codebase." Don't show your face.

**Say:**

> "Autonomous agents can write code, run analysis, and call APIs. But they can't pay for things autonomously. Every existing payment rail — Stripe, ACH, even most crypto wallets — was built for humans with accounts, KYC, and monthly invoices."

> "Agents need something different: per-call payments, signed authorization with no stored credentials, on-chain proof of every transaction, and reputation that follows the agent across platforms. That's x402 — the emerging standard for HTTP-native payments."

> "LedgerForge is the production rail for x402 on Mantle. Let me prove it isn't vaporware."

---

## Shot 2 — The setup line (0:30 — 0:45)

**On screen:** still terminal. Type `npm run scout` but don't press enter yet.

**Say:**

> "I'm going to run an autonomous agent that spends real USDC. It'll discover skills on our marketplace, pay for five of them sequentially, analyze the result, and produce an investment decision. Every step lands on Mantle mainnet. One command."

[Hit enter.]

---

## Shot 3 — The agent runs (0:45 — 2:15)

**On screen:** the scout output streaming. Don't skip ahead — let judges see real network latency. ~25 seconds per settlement is the point.

**Say (while it runs):**

> "Pre-flight checks pass — the wallet has USDC, the operator is approved."

> ⚠ **Read the live numbers off the terminal** — don't memorize them. Every run produces fresh job IDs and APRs. The only safely-quotable hardcoded numbers are the **85% confidence**, the **20bps fee**, and the **0.0499 / 0.0001 USDC payout split** (all deterministic).

[First `✓` lands:]

> "First skill — Byreal's top concentrated-liquidity pools by 24-hour APR. That's a real payment from my consumer wallet through the x402 escrow contract to a fresh provider wallet. The escrow job ID — [read the number off the screen] — lands on-chain."

[Second `✓`:]

> "Aave V3 supply rate for USDC, read on-chain."

[Third `✓`:]

> "Live USDC and USDe prices."

[Fourth `✓`:]

> "Current Mantle gas cost — the agent needs this to decide whether rotating positions is worth the friction."

[Decision prints. Speak slower, this is the punch line:]

> "And here's the decision. Top Byreal pool yields — [read the percent off screen]. Aave USDC supply yields — [read the percent off screen]. The delta is huge either way. Gas is a fraction of a cent. The agent recommends ENTER_POOL — eighty-five percent confidence."

[Fifth `✓` lands:]

> "Because it chose to rotate, the agent buys one more skill — Byreal's swap-preview — to model the trade. Five settlements, twenty-five Mantle transactions, two and a half minutes, twenty-five cents."

---

## Shot 4 — Digest + on-chain proof (2:15 — 2:55)

**On screen:** open the freshly written `agents/scout-runs/scout-<timestamp>.md` in VS Code's Markdown preview (Cmd+Shift+V). Scroll to the **Settlements** table, then the **Reputation writes** table immediately below it.

**Say:**

> "Every run writes a markdown digest. TL;DR at the top: five paid skills, twenty-five mainnet transactions, the decision, the reasoning."

[Scroll to the Settlements table.]

> "Here are the five settlements — each one a real escrow job. Let's verify one."

[Click the first `completeJob` link. Mantlescan opens.]

> "Job ID — [read it from the page] — the escrow contract paying the provider 0.0499 USDC, with a twenty-basis-point fee. The skill ID is in the event log. That's the real x402 flow on-chain."

[Go back to the digest tab. Point at the **Reputation writes** table.]

> "And the digest also surfaces the reputation writes — for every settlement we hit both our local SkillRegistry and the canonical ERC-8004 Reputation Registry on Mantle."

[Click any ERC-8004 feedback tx link.]

> "Here's a `giveFeedback` call on ERC-8004 — every paid call updates the provider's portable reputation. I'll come back to why that matters in a second."

---

## Shot 5 — The SDK as a product (2:55 — 3:25)

**On screen:** switch to the **npm package page** tab: https://www.npmjs.com/package/@ledgerforge/x402-mantle. Scroll once so the install line and README preview are both visible.

**Say:**

> "That's not just one agent. The whole thing is built on a public SDK — `@ledgerforge/x402-mantle`, live on npm. One command to install."

[Switch to the editor showing this snippet:]

```ts
import { LedgerForgeClient } from "@ledgerforge/x402-mantle";

const client = new LedgerForgeClient({ privateKey });
const skills = await client.listSkills({ minScore: 80 });
const { output, receipt } = await client.invoke(skills[0].skillId, {
  amount: "50000",                  // 0.05 USDC
  query: { asset: "USDC" },
});
console.log(receipt.escrowJobId, receipt.completeJobTxHash);
```

> "This is the entire API. `listSkills` returns reputation-ranked services. `invoke` does the EIP-712 signing, the escrow custody, the settlement, and the reputation write in a single async call. Anyone with a Mantle wallet can build an autonomous agent that pays — or earns — through this rail."

---

## Shot 6 — Marketplace breadth (3:25 — 3:40)

**On screen:** dashboard tab — https://dashboard-xi-sooty-72.vercel.app. Scroll through the skill list once.

**Say:**

> "And here's the marketplace today. Fifteen skills registered. Thirty-plus settled jobs. All public, all on-chain. The indexer API is open — agents and humans see the same data. Anyone can list a skill, set a price, accept payment. Anyone."

---

## Shot 7 — The vision close (3:40 — 4:00)

**On screen:** back to the mantlescan tab on the ERC-8004 Reputation Registry contract page. Let the contract address sit on screen — `0x8004BAa1…` — while you deliver the close.

**Say:**

> "Every settlement writes to ERC-8004 — the canonical reputation standard. That means a skill's track record isn't locked to LedgerForge. Any other ERC-8004 marketplace can read the same reputation. We're not building a silo. We're building rails."

> "When a thousand agents pay a thousand skills every day, that's an economy. We're shipping the rail. LedgerForge."

[Stop recording.]

---

## Things to do BEFORE recording

1. **Top up the consumer wallet.** Each run costs ~0.25 USDC + ~0.05 MNT. Have at least 1 USDC and 0.2 MNT. The script aborts if balance is too low — that's an embarrassing recording.
2. **Verify the npm publish is searchable.** Run `npm view @ledgerforge/x402-mantle` and load the npm page in a browser — sometimes it takes a few minutes for the registry to show new packages.
3. **Pre-fetch the dashboard tab.** If `dashboard-xi-sooty-72.vercel.app` cold-starts during your recording, you'll get a blank page. Hit it once a minute before you record.
4. **Pre-load mantlescan tx.** Pick one of your past `completeJob` tx hashes (e.g. `0x9172f2dc…`) and have it ready as a tab — saves time vs. clicking from the digest live.
5. **Clear scroll history**, set terminal to 18pt, window to ~120 cols × ~30 rows, set the prompt to something short (avoid wrapping).
6. **Make the snippet file** ready: create `~/scratch/sdk-snippet.ts` with the 9-line snippet from Shot 5 so you can flash to it instantly without typing.

## Things to do AFTER recording

1. Trim aggressively *only* between settlements in Shot 3 — keep the latency visible enough to feel real, but you can compress dead air a bit if your editor allows.
2. Add a single end-card frame at 4:00 with: project name, the GitHub URL, the DoraHacks submission URL, your handle. 3-5 seconds, then black.
3. Total upload should be under 4:05 including the end card.
4. Sanity-check: watch your own video with the sound off. The on-screen action (terminal output, mantlescan, dashboard, npm page) should make the story land even without narration. If it doesn't, restage.

## Three-minute lean cut (fallback)

If 4:00 feels too long after editing, cut these in this order:
1. Shot 6 (marketplace breadth) — drop entirely. The dashboard URL still appears in the DoraHacks submission.
2. Shot 7 — shorten to: *"Every settlement writes to ERC-8004. Reputation is portable. LedgerForge."*
3. Compress Shot 3 narration — let the visual flow carry more, narrate every other settlement instead of all five.

That gets you to ~3:00 while keeping the vision hook (Shot 1) and the SDK shot (Shot 5), which are the two most-important additions over the original lean script.

## Backup option: pre-recorded scout run

If you don't want to spend USDC on the recording itself:
- Run `npm run scout` ahead of time, capture the terminal output, and use it as a pre-rendered video in Shots 2-3.
- Shot 4 still works live — open an existing `agents/scout-runs/*.md` digest.
- Shot 5-7 are unchanged.
- The judges still see real mainnet txs via mantlescan; the only thing pre-rendered is the terminal animation.
