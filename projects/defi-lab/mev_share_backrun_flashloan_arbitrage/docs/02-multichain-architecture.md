# 02 — Multi-Chain Architecture

## Target architecture (full picture — most is BUILD LATER)

```
                 ┌──────────────────────────────────────────────┐
                 │                COLLECTORS                      │
   Ethereum ───▶ │  MEV-Share SSE + hint backfill   [BUILD NOW]   │
   Base     ───▶ │  block-delta + swap-log scanner  [BUILD NOW]   │
   Arbitrum ───▶ │  block-delta + swap-log scanner  [BUILD NOW]   │
   BNB      ───▶ │  block-delta scanner             [LATER]       │
   Polygon  ───▶ │  block-delta scanner             [LATER]       │
   Optimism ───▶ │  block-delta scanner             [LATER]       │
                 └───────────────────────┬──────────────────────┘
                                          ▼
                 ┌──────────────────────────────────────────────┐
                 │  DECODER  → NormalizedEvent        [BUILD NOW] │
                 └───────────────────────┬──────────────────────┘
                                          ▼
        ┌────────────────────┐   ┌────────────────────┐
        │ POOL REGISTRY       │   │ STATE READER        │   [BUILD NOW: v2/sushi-v2]
        │ v2/sushi [NOW]      │   │ v2 reserves [NOW]   │   [LATER: v3/v4/bal/curve]
        │ v3/v4/bal/curve[L8R]│   │ v3 ticks [LATER]    │
        └─────────┬──────────┘   └─────────┬──────────┘
                  └───────────┬────────────┘
                              ▼
                 ┌──────────────────────────────────────────────┐
                 │  STRATEGY ENGINE (pluggable)        [NOW: API] │
                 │   backrun-v1                         [BUILD NOW]│
                 │   cyclic-arb / lending-arb / blind   [LATER]    │
                 └───────────────────────┬──────────────────────┘
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
                    ┌──────────────┐ ┌─────────┐ ┌──────────────┐
                    │ SIMULATION   │ │ PnL     │ │ RISK ENGINE  │
                    │ fast-est NOW │ │ ACCT NOW│ │ deterministic│
                    │ fork  LATER  │ │         │ │   [BUILD NOW]│
                    └──────┬───────┘ └────┬────┘ └──────┬───────┘
                           └──────────────┼────────────┘
                                          ▼
                 ┌──────────────────────────────────────────────┐
                 │  STORAGE (Postgres = source of truth) [NOW]   │
                 │  + ML-ready feature rows               [NOW]  │
                 └───────────────────────┬──────────────────────┘
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
                    ┌──────────────┐ ┌─────────┐ ┌──────────────┐
                    │ METRICS NOW  │ │ REPORTS │ │ ALERTS (TG)  │
                    │ Prometheus   │ │ daily   │ │   [BUILD NOW]│
                    └──────────────┘ └─────────┘ └──────────────┘

   DEFERRED CROSS-CUTTING:  Redis cache [LATER]   ML training/serving [LATER]
   DO NOT BUILD YET:  live bundle sender · flashloan executor contract · live exec path
```

## V1 build (the minimal 24/7 slice)

A **single Rust worker binary** running these async tasks under one Tokio runtime:

1. `collector::mevshare` (Ethereum SSE + backfill)
2. `collector::block_delta` (Base, Arbitrum) — one task per chain
3. `decoder` (shared) → `NormalizedEvent`
4. `registry` + `state_reader` (v2/sushi-v2)
5. `strategy::backrun_v1` (detect → score)
6. `pnl` + `risk` (price + gate-for-shadow-tag)
7. `storage` (Postgres writer, batched)
8. `metrics` + `health` (axum, localhost) + `alerts` (Telegram)
9. `reporter` (daily)

One binary, not microservices — **DO NOT** split into services until profiling proves a
need. Async tasks communicate via bounded `tokio::mpsc` channels with backpressure.

## Internal data flow (V1)

```
collector → raw_events (Postgres, async batched)
          → NormalizedEvent (in-memory channel)
              → decoder enriches (pool impact)
                  → strategy.detect() → CandidateOpportunity[]
                      → state_reader (alternate venue quotes)
                          → pnl.estimate() + risk.assess()
                              → ScoredOpportunity (+ shadow tag)
                                  → candidate_opportunities + ml_features (Postgres)
```

Raw event ingestion must **never block** on downstream work: collectors write raw rows
and push normalized events onto a bounded channel; if the channel is full, drop-to-DB
(raw is persisted regardless) and increment a drop counter rather than stalling ingest.

## Why one normalized event model

Every collector — MEV-Share hint, Base swap log, Arbitrum reserve change — is mapped into
**one** `NormalizedEvent` so strategies and storage are chain-agnostic. The collector
knows the chain's quirks; everything downstream sees a uniform shape. This is what makes
cross-chain comparison (the whole point of V1) possible. See `06-event-normalization.md`.

## Architecture principle restated

Scan broad, store everything, compare. Promote exactly one chain + one strategy to live
**later**, only on evidence. The architecture is built so adding a chain = adding a
collector, and adding a strategy = adding a plugin — neither touches the core.
