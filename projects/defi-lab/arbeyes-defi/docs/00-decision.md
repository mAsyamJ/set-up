# 00 — Product Decision

## The decision

Build **one** product first: `apps/cow-shadow-solver`, a read-only Rust engine that
listens to live CoW Protocol batch auctions, recomputes solver scores from public
data, generates simple candidate routes, and logs whether it *would have* scored
competitively against the real winning settlement.

Nothing is submitted on-chain. No funds move. No smart contracts are deployed.

The workspace that exists on day one is exactly:

```
rust-searcher-lab/
  apps/cow-shadow-solver/
  crates/core/
  crates/evm/
  crates/storage/
  docs/cow-shadow-solver/
```

## Why CoW shadow solver, and why first

Three reasons, in order of weight:

1. **It has a public, structured validation environment that almost no other DeFi
   searcher strategy offers.** CoW publishes the settled solver competition for every
   auction — winner, score, reference scores, executed amounts. That means you can
   grade your own engine against ground truth *without spending a cent or risking a
   wei*. Most searcher strategies (arbitrage, liquidations, backrunning) give you no
   such feedback short of sending a live transaction and losing money.

2. **The scoring rule is documented and (mostly) reproducible.** Per CIP-38 / CIP-65 /
   CIP-67, the per-order score formula is published. This makes a precise,
   pass/fail validation gate possible: *can my code reproduce the winning settlement's
   score from public inputs?* If yes, the engine's core math is trustworthy. If no,
   every downstream number is fiction and the project stops cheaply.

3. **The reference implementation is Rust.** `cowprotocol/services` (autopilot,
   orderbook, driver, solvers) is Rust and uses the same stack we will (tokio, alloy,
   sqlx, tracing). The ecosystem fit is exact, so the learning transfers directly.

## The primary validation question

> Can my Rust shadow solver reproduce real CoW scoring and generate competitive
> candidate scores against settled auctions?

Everything in this product serves that question. The product is **not** "a profitable
solver." It is "evidence about whether a profitable solver is worth pursuing."

## Success criteria (14 days)

- The engine recomputes the **winning settlement's score** from public auction data
  within **1% tolerance** on **≥80% of 100+ settled auctions**. (This is the gate.)
- After the gate passes: the engine produces candidate routes and tags each settled
  auction `Competitive | Marginal | NotCompetitive`, with a documented per-pair
  win-rate and p50/p95 score-gap distribution.
- The engine runs unattended on a $10–$30/month VPS for **72 hours** without crashing.

## Kill criteria

- **Gate failure:** if the engine cannot reproduce the winning score within tolerance
  on the majority of auctions *after* honest debugging, stop. Do not build route
  generation. The scoring model is either misunderstood or not publicly reproducible,
  and a shadow comparison built on a broken scorer is worthless.
- **No competitiveness:** if, after the gate passes, the engine beats the winning score
  on **<2% of 1000+ auctions**, CoW production solving is not worth the bonding capital
  (see `02-product-scope.md`). The shadow solver remains a portfolio artifact; PnL
  effort pivots to a later product.

## Explicitly out of scope (Product 1)

No live solver submission. No funds. No smart contracts. No flashloan execution.
No OEV/SVR module. No MEV-Share backrun module. No Uniswap v4 hook scanner. No web
dashboard. No AI layer. No generic strategy framework. No empty future folders.

Flashloans in particular are deferred to a **future Product 4 (Flashloan Arbitrage
Feasibility Engine)** and appear in this pack only in `18-do-not-build-yet.md` and the
later-roadmap notes. Merging flashloan execution into Product 1 would combine two hard
problems — CoW solver scoring and live arbitrage execution — which is exactly the scope
creep this plan exists to prevent.

## One-line summary

> Build a read-only CoW shadow solver in Rust. Pass the scorer-reproduction gate before
> writing anything else. Let the win-rate data decide whether Phase 2 is justified.
