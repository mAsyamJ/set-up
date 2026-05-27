# Repo & Plugin Architecture

The target repo is large; **V1 builds only the tagged subset.** This separates the full
shape (so the design doesn't block the future) from what an agent should actually create
now.

## Target repo shape (most is BUILD LATER)

```
rust-searcher-lab/
  Cargo.toml                 # workspace
  rust-toolchain.toml        # stable >= 1.85
  infra/
    docker-compose.yml       # [NOW] Postgres only
    .env.example
  config/
    local.toml.example
    vps.toml.example
  migrations/                # [NOW] sqlx Postgres migrations
  apps/
    searcher-worker/         # [NOW] the one 24/7 binary
    replay-cli/              # [LATER] historical replay / backfill tool
    admin-api/               # [LATER] ops endpoints
  crates/
    core-types/              # [NOW] NormalizedEvent, ids, U256 newtypes, enums
    config/                  # [NOW] config load (env + TOML)
    storage/                 # [NOW] Postgres pool, migrations, batched writer
    collectors/              # [NOW] Collector trait + registry of collectors
    mevshare/                # [NOW] Ethereum MEV-Share SSE + backfill
    chain-watchers/          # [NOW] L2 block-delta collectors (Base, Arbitrum)
    decoder/                 # [NOW] raw -> NormalizedEvent enrichment
    registry/                # [NOW] pool registry (v2/sushi-v2)
    state-reader/            # [NOW] v2 state reads + snapshots + freshness
    dex/                     # [NOW] DexAdapter trait + UniV2/SushiV2 impl
    strategy-api/            # [NOW] Strategy trait + context types
    strategies/
      backrun-v1/            # [NOW] the only V1 strategy
      cyclic-arb/            # [LATER]
      lending-arb/           # [LATER]
      blind-backrun/         # [LATER]
    simulator/               # [NOW] FastEstimateSim + Simulator trait; ForkReplaySim [LATER]
    pnl/                     # [NOW] net-of-bribe accountant + survival tests
    risk/                    # [NOW] deterministic risk engine
    cache/                   # [NOW] in-memory; Redis-backed impl [LATER]
    metrics/                 # [NOW] Prometheus + health
    ml/                      # [LATER] feature schema [NOW], training/serving [LATER]
    execution/               # [DO NOT BUILD YET] live bundle sender
  contracts/                 # [DO NOT BUILD YET] FlashloanExecutor + adapters + guards
  docs/searcher-engine/      # this pack
```

## V1 crates to actually create now (BUILD NOW)

```
core-types, config, storage, collectors, mevshare, chain-watchers, decoder,
registry, state-reader, dex, strategy-api, strategies/backrun-v1,
simulator (fast-estimate + trait), pnl, risk, cache (in-memory), metrics
+ apps/searcher-worker
+ migrations/, infra/docker-compose.yml (Postgres)
+ crates/ml: ONLY the feature-row schema/writer, NO model
```

Do **not** create: `apps/replay-cli`, `apps/admin-api`, `crates/execution`, `contracts/`,
`strategies/{cyclic-arb,lending-arb,blind-backrun}`, any Redis impl, any ML model code.
No empty placeholder folders.

## Plugin separation (what lives where)

| Layer | Crate | Changes when you add a… |
|-------|-------|--------------------------|
| Event sourcing per chain | `collectors`, `mevshare`, `chain-watchers` | …chain (add a collector) |
| Normalization | `decoder`, `core-types` | rarely |
| Pool data / quoting per DEX | `registry`, `state-reader`, `dex` | …DEX (add a `DexAdapter`) |
| Edge logic | `strategies/*` via `strategy-api` | …strategy (add a plugin crate) |
| Cost math | `pnl` | never per-strategy (shared) |
| Safety | `risk` | never per-strategy (authoritative) |
| Execution | `execution`, `contracts` (LATER) | when going live |

**Adding a chain** = a collector + config + seeded pools. **Adding a DEX** = a `DexAdapter`
impl + registry support. **Adding a strategy** = a crate implementing `Strategy` + config
registration. None of these touch the worker's core wiring — that's the whole point of the
plugin design.

## Worker wiring (BUILD NOW)

`apps/searcher-worker/main.rs`: load config → init telemetry → connect Postgres + run
migrations → build in-memory caches → start enabled collectors (each its own task) →
fan-in `NormalizedEvent`s → for each: decode → `backrun_v1.detect/score` → pnl + risk →
persist (one tx) → metrics → daily-report scheduler → axum health/metrics → Telegram
alerts → graceful shutdown via `CancellationToken`.
