# Data Flows and Event Normalization (V1 Shadow Scanner)

This document describes the end-to-end data movement in the V1 system. It is derived from the official architecture docs and validated against all hard constraints in `03-constraints-and-gates.md`.

## High-Level Data Flow (V1)

```mermaid
flowchart LR
    subgraph Collectors
        direction TB
        E[MEV-Share SSE\nEthereum] --> RawE[Raw Hints]
        B1[Block-Delta\nBase] --> RawB1[Raw Logs / Deltas]
        B2[Block-Delta\nArbitrum] --> RawB2[Raw Logs / Deltas]
    end

    RawE --> Decoder
    RawB1 --> Decoder
    RawB2 --> Decoder

    Decoder --> NE[NormalizedEvent\n(single canonical model)]

    NE --> Strategy[Strategy Engine\n(backrun-v1)]

    Strategy --> Candidate[CandidateOpportunity[]]

    Candidate --> PnL[PnL + Flashloan Fee Model]

    PnL --> Risk[Deterministic Risk Engine]

    Risk --> Tagged[Tagged ScoredOpportunity]

    Tagged --> Storage[(Postgres\ncandidate_opportunities\npnl_estimates\nml_features)]

    Storage --> Reports[Daily Cross-Chain Reports]
    Storage --> Metrics[Prometheus + Alerts]
```

**Critical Rule**: Raw event ingestion **never blocks** on downstream work. Collectors write raw rows and push to bounded channels. Backpressure → drop-to-DB with counters.

## NormalizedEvent (The Unifying Model)

Defined in `docs/06-event-normalization.md`.

Key fields (conceptual):
- `chain_id`
- `event_kind` (MevShareHint, SwapObserved, ReserveChanged, etc.)
- `block_number`, `tx_hash` (where available)
- `pool_address`, `token_in`, `token_out`
- `amount_in`, `amount_out` (U256)
- `partial_info` flags (what the hint actually revealed)
- Timestamp, source collector

Every collector (MEV-Share, Base block-delta, Arbitrum block-delta) maps its native events into this single shape. This is what makes cross-chain comparison possible.

## Collector-Specific Flows

### Ethereum – MEV-Share SSE (docs/07)
- Connects via `eventsource-stream`
- Receives hints with varying completeness (hash only, logs, callData, functionSelector, etc.)
- Historical backfill collector for training data
- Partial-info handling is first-class

### L2 Block-Delta Collectors (Base + Arbitrum) (docs/08)
- Poll latest block
- For registered pools: `eth_getLogs` for Swap events + reserve/tick reads
- Emit `SwapObserved` and `ReserveChanged`
- No private orderflow — pure public post-inclusion observations

## Strategy → PnL → Risk Pipeline

1. `backrun-v1` (only strategy in V1) receives `NormalizedEvent`
2. Detects long-tail v2-style mispricing candidates
3. Produces `CandidateOpportunity` (shadow "execution plan" — never sendable calldata)
4. `pnl` crate computes honest net PnL including:
   - Gas
   - Bribe (multiple survival thresholds: 50/75/90%)
   - Flashloan fee (modeled as cost only)
   - DEX fees, slippage, failed attempt buffer
5. **Deterministic Risk Engine** (authoritative):
   - Token denylist / FoT / rebasing
   - Liquidity thresholds
   - State freshness
   - Sim confidence
   - Outputs: Pass / Downgrade / Reject
6. Everything is persisted (even downgraded/rejected rows) for analysis.

## Storage Model (High Level)

From `docs/05-postgres-schema.md` (core tables):
- `raw_events`
- `normalized_events`
- `candidate_opportunities`
- `pnl_estimates`
- `ml_features` (collected from day one — no model in V1)
- `pool_registry`
- `daily_reports` (materialized or computed)

All money fields are `NUMERIC(78,0)` or equivalent.

## Metrics & Observability Flow

- Every major stage emits counters/histograms (ingest rate, channel depth, risk distributions, DB batch sizes, alert triggers)
- `/health` and `/metrics` via axum
- Telegram alerts for sustained collector lag or error storms
- Tracing JSON → journald

## Backpressure & Reliability Guarantees

- Collectors are the only source of truth for "what happened"
- If the internal channel fills, raw events are still written; normalized events may be dropped with a counter
- Graceful shutdown via CancellationToken

This flow is deliberately simple and linear in V1 so that any deviation from expected behavior is easy to detect during the 72h+ VPS soak.

All downstream components (strategy, PnL, risk, reporter) are consumers of this clean normalized stream + Postgres historical state.
