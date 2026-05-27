# 20 — Agentic Coding Prompt (V1 Only)

Paste the block below into Cursor / Claude Code. It enforces the V1 boundary and build
order. Read the rest of `docs/searcher-engine/` as the source of truth.

---

````
You are implementing V1 ONLY of the Rust Multi-Chain Backrun / Mispricing SHADOW Searcher,
per docs/searcher-engine/. SHADOW MODE ONLY: no bundle submission, no funds, no contracts,
no live execution. Postgres is the source of truth. One 24/7 VPS-runnable Rust worker.

WORKSPACE (create exactly these crates/apps — NOTHING MORE):
  rust-searcher-lab/
    Cargo.toml (workspace), rust-toolchain.toml (stable >= 1.85)
    infra/docker-compose.yml          # Postgres ONLY
    config/{local,vps}.toml.example
    migrations/                       # sqlx Postgres migrations from docs 05
    apps/searcher-worker/
    crates/core-types, config, storage, collectors, mevshare, chain-watchers,
           decoder, registry, state-reader, dex, strategy-api,
           strategies/backrun-v1, simulator, pnl, risk, cache, metrics, ml
  In crates/ml create ONLY the feature-row schema + writer. NO model code.

DO NOT CREATE: apps/replay-cli, apps/admin-api, crates/execution, contracts/,
  strategies/{cyclic-arb,lending-arb,blind-backrun}, any Redis impl, any ML model/training/
  serving, any web dashboard, any empty placeholder folders.

DEPENDENCIES: tokio, reqwest(json,rustls-tls,stream), eventsource-stream, serde+serde_json,
  sqlx(runtime-tokio,postgres,macros,migrate,json,chrono), tracing+tracing-subscriber(json,
  env-filter), axum, metrics+metrics-exporter-prometheus, alloy(full), dashmap, lru,
  anyhow, thiserror, async-trait, tokio-util, rust_decimal. Use ALLOY, not ethers-rs.

BUILD ORDER (do not deviate):
  1. Workspace + core-types (NormalizedEvent, EventKind, ChainId, U256 newtypes, enums per
     docs 06) + config crate (env+TOML).
  2. infra/docker-compose.yml (Postgres) + migrations/ from docs 05 + storage crate
     (PgPool, migrate on startup, BATCHED async writer that never blocks ingest).
  3. dex crate: DexAdapter trait + UniswapV2/SushiV2 impl (getReserves read, closed-form
     quote_out/quote_in, integer U256 math). registry crate (Postgres-backed + dashmap
     cache, by_address/by_pair, seeding via factory PairCreated logs or curated list).
     state-reader crate (latest reserves + snapshots + freshness flag).
  4. collectors crate (Collector trait + fan-in). mevshare crate (Ethereum SSE via
     eventsource-stream + reconnect/backoff/dedup + hint backfill; map to NormalizedEvent,
     partial_info handling per docs 07). chain-watchers crate (Base + Arbitrum block-delta:
     poll head, eth_getLogs for registered pools, snapshots, emit SwapObserved/
     ReserveChanged per docs 08). decoder crate (enrich raw -> NormalizedEvent).
  5. strategy-api crate (Strategy trait + contexts per docs 03). strategies/backrun-v1
     (detect/score per docs 10; shadow build_execution returns a plan, NEVER sendable
     calldata).
  6. pnl crate (net = gross - gas - bribe - flashloan_fee - dex_fees - slippage -
     failed_attempt - safety_buffer; survives_50/75/90; docs 12) + flashloan FEE model
     (Balancer 0% first, Aave 5bps second; feasibility only; docs 11). NO executor.
  7. risk crate (deterministic gates per docs 14: token denylist/FoT/rebasing, low
     liquidity, stale state, sim confidence; Pass/Downgrade/Reject; AUTHORITATIVE — nothing
     may override it).
  8. simulator crate (FastEstimateSim closed-form NOW + Simulator trait; ForkReplaySim is
     LATER, do not implement).
  9. cache crate (in-memory dashmap/lru; stale => downgrade; NO Redis).
 10. metrics crate (Prometheus exporter on 127.0.0.1, all counters/histograms + latency
     budget from docs 15) + axum /health + /metrics. Telegram alerts via reqwest.
 11. ml crate: feature-row struct + writer to ml_features ONLY. No model.
 12. apps/searcher-worker: wire it all (docs repo-and-plugin-architecture.md "Worker
     wiring"): load config, init telemetry, connect PG + migrate, build caches, start
     enabled collectors (ENABLED_CHAINS=ethereum,base,arbitrum), fan-in events, per event
     decode -> backrun_v1.detect/score -> pnl + risk -> persist one tx -> metrics; daily
     report scheduler; graceful shutdown via CancellationToken.

HARD RULES:
  - SHADOW ONLY. No mev_sendBundle, no signing, no funds, no contracts, no live path.
  - Flashloan is a FEE/feasibility number in pnl, never executed.
  - Risk engine is deterministic and authoritative; ML (absent in V1) could never override it.
  - Event ingestion NEVER blocks on downstream work; DB writes are batched/async; on
    backpressure persist raw + drop-with-counter, do not stall collectors.
  - All token amounts/scores are U256 (NUMERIC(78,0) in PG); floats only at report boundary.
  - Postgres is source of truth; caches are in-memory and rebuildable.
  - cargo fmt + clippy -D warnings clean. Unit tests offline (mock SSE/RPC + fixtures);
    live calls in a separate env-gated integration suite.

DELIVERABLE: a single binary that runs under systemd + Docker-Compose Postgres, ingests
Ethereum (MEV-Share) + Base + Arbitrum (block-delta) in shadow, produces graded
candidate_opportunities + pnl_estimates + ml_features, exposes /metrics + /health, sends
Telegram alerts, and prints a daily cross-chain report.

START with steps 1–4 (workspace, Postgres+migrations+storage, dex+registry+state-reader,
collectors+mevshare+chain-watchers). After step 6 (pnl), run the worker against live
Ethereum MEV-Share + one L2 and show the first graded candidates with survives_75 before
continuing to risk/metrics polish.
````

---

## Operator notes (you, not the agent)

- Seed the v2/sushi-v2 pool registry for a curated set of long-tail WETH/base pairs per
  chain before expecting candidates.
- Use public RPC free tiers to start; add a paid L2 RPC only if `eth_getLogs` rate limits
  bite.
- Resist "just add v3 / just add Redis / just send one test bundle." Those are Day 30/60/90
  gated decisions, not V1.
- The first number that matters is **per-chain `survives_75` count** in the daily report.
  That's the edge signal the whole V1 exists to produce.
