# 00 — Executive Decision

## The product

**Rust Multi-Chain Backrun / Mispricing Shadow Searcher** — a single 24/7 Rust worker
that scans multiple chains for backrun/mispricing opportunities, normalizes everything
into one event model, prices each opportunity with honest net-of-bribe PnL accounting,
and **logs whether it would have been profitable — without submitting a single
transaction.**

It is a measurement instrument first. Its output is a Postgres database of graded
opportunities across chains, DEXes, tokens, and strategies, plus a daily comparison
report answering: *where, and how often, would an edge actually have survived costs?*

## The governing principle: broad scanner / narrow executor

- **Broad scanner:** observe many chains (Ethereum via MEV-Share; Base/Arbitrum and
  later BNB/Polygon/Optimism via block-delta collectors), normalize into one model, store
  everything, compare.
- **Narrow executor:** live execution is **out of V1 entirely**. It is promoted later to
  exactly one chain + one strategy, and only after shadow data proves an edge survives a
  conservative bribe assumption.

The danger this avoids is the seductive wrong version: *a multi-chain live flashloan bot
on day one.* That is expensive, risky, and — per all prior analysis — the weakest solo
PnL bet. We build the multi-chain **shadow** scanner instead.

## Three-tier tagging (applied in every doc)

Every component in this pack is tagged:

- **BUILD NOW** — part of the V1 24/7 VPS slice.
- **BUILD LATER** — in the target architecture, deferred until shadow data or a measured
  bottleneck justifies it.
- **DO NOT BUILD YET** — explicitly forbidden in the near term (scope-creep traps).

## What V1 is (BUILD NOW)

One Rust worker binary + Postgres (Docker Compose) + systemd, running 24/7, doing:

- Ethereum **MEV-Share SSE** collector + historical hint backfill.
- **Base** and **Arbitrum** block-delta collectors (shadow only).
- Raw + normalized event storage in Postgres.
- DEX/pool event decoder; **UniswapV2/SushiV2-style** pool registry first.
- State reader for v2-style pools.
- **backrun-v1** long-tail mispricing candidate detector.
- **PnL accountant** with gas/bribe/slippage/flashloan-**fee** model.
- **Flashloan feasibility model only** (no executor, no live flashloan).
- Simulation/replay **placeholder** (fast-estimate now; fork replay later).
- Prometheus metrics endpoint (localhost), tracing JSON → journald, Telegram alerts.
- Daily cross-chain comparison report.
- **ML-ready feature rows collected into Postgres from day one** (no model yet).

## What V1 is NOT (DO NOT BUILD YET in V1)

Redis, ML model training/serving, web dashboard, microservices, live bundle sender,
flashloan executor contract, multi-chain *live* execution, Uniswap v4 live strategy,
generic public flashloan arb, deep learning, Kubernetes, self-hosted archive node.

## Success criteria (drives the 14/30/60/90 plan)

- V1 runs 24/7 on a cheap VPS for a sustained soak (≥72h, then weeks) without crash/leak.
- Postgres accumulates graded opportunities across ≥3 chains with full PnL fields and
  ML-ready features.
- The daily report shows, per chain/DEX/pair, how many opportunities survive a **75%
  bribe-capture** assumption — the first real edge signal.

## Kill / pivot criteria

- If after weeks of multi-chain shadow data **no chain/strategy shows opportunities that
  survive 75% bribe capture with a coherent, repeatable pattern**, do not build execution.
  The edge isn't there; pivot strategy (e.g. OEV/SVR) or sunset.
- If the only "profitable" rows collapse under accurate replay (later phase), the
  fast-estimate is lying — fix or stop before any live work.

## One-line summary

> Build a multi-chain backrun **shadow** scanner in Rust, Postgres-backed, 24/7 on one
> cheap VPS. Prove net-of-bribe edge exists somewhere before building any executor.
> Flashloans are modeled, never executed, in V1.
