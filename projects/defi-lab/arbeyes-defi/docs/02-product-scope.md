# 02 — Product Scope

## What Product 1 is

A **read-only shadow solver**: a Rust service that consumes live CoW Protocol auction
data, mirrors what a real solver engine would compute (scores and candidate
settlements), and grades itself against the publicly-published winning settlement —
without ever participating on-chain.

It is a measurement instrument, not a money-making machine. Its output is a database of
graded auctions and a daily report answering: *how often, and by how much, would my
engine have been competitive?*

## What it does (in shadow mode)

1. Polls the CoW orderbook API for the current auction (orders + native prices).
2. Normalizes each order (decimals, sell/buy, partial-fillability, validity).
3. Generates simple candidate routes per order:
   - CoW `/quote` baseline (reference)
   - Uniswap v2 direct fill
   - Uniswap v2 2-hop via WETH/USDC
4. Computes the per-order score using the documented CIP-38/65 formula.
5. After settlement, fetches the solver competition for that auction and **recomputes
   the winning settlement's score** to validate the scorer (the gate).
6. Compares the engine's best aggregate score to the winner's reported score and tags
   the auction `Competitive | Marginal | NotCompetitive`.
7. Logs everything to SQLite; emits Prometheus metrics; prints a daily report.

## What it does NOT do

- Does **not** submit solutions to the autopilot/driver.
- Does **not** hold, move, or risk funds.
- Does **not** deploy or call settlement-affecting contracts.
- Does **not** use flashloans, OEV bidding, or MEV-Share backrunning.
- Does **not** route through Uniswap v3/v4, Balancer, or Curve initially (v2 + CoW
  `/quote` only).
- Does **not** claim "would have won the combinatorial auction" — only "would have
  scored higher than the winning settlement" (see reproducibility note below).

## Why this is not a real production solver yet

Production solving requires onboarding that is **capital-prohibitive for a solo dev**:

- **Full bonding pool:** $500,000 in stablecoins **+ 1,500,000 COW**.
- **Reduced bonding pool (CIP-44):** $50,000 (stables/ETH) **+ 500,000 COW** initial,
  ramping to $100,000 + 1,000,000 COW over 12 months.
- **KYC** of the incorporated entity and key developers; **Arbitrum-first** start.
- **15% service fee** on weekly COW rewards (CIP-48), beginning 6 months after joining.

Shadow participation requires **none** of this. The 14-day build runs entirely on public
read endpoints. Onboarding is a *post-validation* decision, made only if the shadow
data justifies the capital.

## The reproducibility boundary (important)

- **Reproducible from public data:** the per-order and per-solution score, given
  `Auction.prices` and executed amounts; direct comparison of your score to the winner's
  reported `score` and to `referenceScore`.
- **NOT reproducible from public data:** the Fair Combinatorial Auction (CIP-67)
  *filtering* pass, which needs competitors' per-pair counterfactual bids that the API
  does not expose. Therefore the shadow comparison is framed as **"score vs. winning
  settlement score,"** explicitly *not* "would have won the auction." This limitation is
  honestly surfaced in logs and reports.

## Validation path

```
cow_client (fetch)
  → models + normalizer (parse)
  → storage (persist raw + normalized)
  → scorer + scorer_validation (GATE: reproduce winner score)
  → [gate pass] route generation
  → compare (grade vs winner)
  → reporter + metrics (observe)
```

The gate sits before route generation deliberately. If you cannot reproduce a known
score, you cannot trust any score you generate.

## 14-day deliverable

A running Rust binary + SQLite database + daily report that:

- Passed the scorer validation gate (≥80% within 1% over 100+ auctions), **or** produced
  a clear, documented reason it could not (which is itself a valid, cheap result).
- Characterized competitiveness across at least several hundred auctions.
- Ran unattended on a cheap VPS for 72 hours.
