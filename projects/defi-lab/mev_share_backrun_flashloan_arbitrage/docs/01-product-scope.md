# 01 — Product Scope

## Primary question V1 answers

> Across multiple chains, do long-tail v2-style backrun/mispricing opportunities exist
> that survive honest net-of-bribe PnL accounting — and if so, on which chain, for which
> pairs, how often, and by how much?

Everything in V1 serves that question. V1 is **not** "a profitable bot." It is the
evidence that tells you whether building an executor is justified, and *where* to point
it.

## Scope tiers

### BUILD NOW (V1)
- One 24/7 Rust worker (single binary, multiple async tasks).
- Postgres (source of truth) via Docker Compose; systemd keeps the worker alive.
- Collectors: Ethereum MEV-Share SSE + hint backfill; Base + Arbitrum block-delta
  (shadow).
- Decoder + v2/Sushi-v2 pool registry + v2 state reader.
- backrun-v1 candidate detector (long-tail, WETH/base-token pairs).
- PnL accountant + gas/bribe/slippage/flashloan-fee model; flashloan **feasibility** only.
- Fast-estimate simulation; replay is a placeholder interface.
- Metrics (localhost Prometheus), tracing JSON → journald, Telegram alerts.
- Daily cross-chain comparison report.
- ML-ready feature rows persisted (no model).

### BUILD LATER (target architecture, deferred)
- Accurate fork/replay simulation (revm/reth or Anvil).
- Redis hot-path cache (only after a measured bottleneck).
- ML: offline feature analysis → model training → scoring/ranking (never gating
  deterministic risk).
- Additional collectors (BNB, Polygon, Optimism); more DEX adapters (v3, v4, Balancer,
  Curve).
- More strategy plugins (cyclic arb, lending/liquidation arb, blind backrun variants,
  v4 hook-aware, OEV/SVR watcher).
- Flashloan executor contract + live bundle sender (after shadow evidence).
- A narrow live-execution path on ONE chain + ONE strategy (canary).

### DO NOT BUILD YET
- Multi-chain *live* execution. Generic public flashloan arb. Stablecoin-only or
  blue-chip ETH/USDC arb as the first strategy. v4-only live strategy. CEX integration.
  Cross-chain arbitrage. Microservices. Kubernetes. Web dashboard (Grafana suffices
  later). Deep learning. LLMs in the hot path. Self-hosted archive node.

## What "shadow mode" means here

The worker ingests real orderflow/blocks, detects candidates, prices them, and writes the
verdict to Postgres. It **never** builds or sends a bundle, never holds funds, never
deploys a contract. Flashloans appear only as a *fee/feasibility model* inside PnL math.

## Why this strategy first (and not the alternatives)

- **Why long-tail v2-style backrun:** lowest competition tier, simplest correct routing
  (`getAmountsOut`), and the only category where a solo scanner plausibly finds
  net-of-bribe edge. It's the #3 PnL path from prior analysis, not the dead #14 generic
  arb.
- **Why not stablecoin same-chain arb first:** thinnest margins, most contested, pennies
  after bribe.
- **Why not blue-chip ETH/USDC first:** owned by integrated searcher-builders; you lose
  the bribe auction structurally.
- **Why not v4-only first:** immature off-chain quoting, new surface, unjustified
  pre-evidence complexity.

## Multi-chain, but shadow-only

V1 scans Ethereum + Base + Arbitrum from day one — but only to *compare* where edge
lives. No chain gets a live path in V1. The collector model (next doc) is explicit that
**MEV-Share is Ethereum-only**; L2s use block-delta scanners.

## 14-day deliverable

A worker running 24/7 on a VPS, a Postgres DB filling with graded multi-chain
opportunities + ML-ready features, and a daily report showing per-chain/pair
survival-after-75%-bribe counts. That report is the first honest read on whether any edge
exists.
