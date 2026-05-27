# 04 — Tech Stack

Format per decision: **Decision / Reason / Tradeoff**, with the required comparisons.
Tier tags apply.

## Mandatory stack (BUILD NOW unless noted)

| Layer | Choice | Tier |
|-------|--------|------|
| Language | Rust | NOW |
| Async runtime | Tokio | NOW |
| EVM library | **alloy** | NOW |
| Database | **PostgreSQL** (source of truth) | NOW |
| Cache | **in-memory (LRU/`dashmap`)**; Redis LATER | NOW / LATER |
| Metrics | Prometheus (localhost) | NOW |
| Dashboards | Grafana | LATER |
| Logging | `tracing` + JSON → journald | NOW |
| Contract testing | Foundry/Anvil fork | LATER (no contracts in V1) |
| Sim (accurate) | revm/reth or Anvil fork | LATER |
| Deployment | Docker Compose (Postgres) + systemd (worker) | NOW |

## Required comparisons & final decisions

### Postgres vs SQLite
- **Decision:** Postgres, from day one.
- **Reason:** runs 24/7 on a VPS as durable infra, not a throwaway script; need
  concurrent writers (multiple collectors), cross-chain comparison queries, and an
  ML-ready dataset that grows for months. `JSONB` for raw payloads, good indexing,
  partitioning later.
- **Tradeoff:** more ops than a SQLite file (mitigated by Docker Compose); needs `sqlx
  prepare`/offline mode for compile-time query checks.

### Redis vs in-memory only
- **Decision:** in-memory (LRU + `dashmap`) in V1; **Redis only after a measured hot-path
  bottleneck**.
- **Reason:** one worker process; shared-memory caches need no network hop and no extra
  container. Redis earns its place only when multiple processes must share hot state or
  the in-memory cache is proven insufficient.
- **Tradeoff:** cache is process-local and lost on restart — fine for V1 (Postgres is the
  truth; caches are rebuildable).

### alloy vs ethers-rs
- **Decision:** alloy.
- **Reason:** ethers-rs is deprecated; alloy is the successor, faster at U256/ABI, used by
  major Rust EVM infra.
- **Tradeoff:** needs Rust ≥ 1.85 (pin in `rust-toolchain.toml`).

### Anvil fork sim vs revm/reth sim
- **Decision:** V1 uses a **fast-estimate** (closed-form v2 math), with a **replay
  placeholder interface**; accurate sim (revm/reth preferred for speed, Anvil as
  fallback) is **BUILD LATER**.
- **Reason:** fast-estimate is enough to grade candidates in shadow and is microseconds,
  not milliseconds. Accurate replay matters only when validating predicted-vs-realized
  PnL before any live work.
- **Tradeoff:** fast-estimate can be optimistic on exotic pools — which is exactly why
  the risk engine denylists exotic tokens and the replay phase exists before live.

### Single binary vs microservices
- **Decision:** single binary, multiple async tasks.
- **Reason:** cheaper, simpler, lower latency (no inter-service hops), trivial to run
  under systemd. Microservices add ops cost with zero benefit at this scale.
- **Tradeoff:** one process to crash — mitigated by `Restart=always` and bounded tasks;
  revisit only if profiling proves a split is needed.

### VPS vs local machine
- **Decision:** develop on Windows + WSL2; run 24/7 on a cheap VPS.
- **Reason:** identical Ubuntu userland; the scanner must run continuously, which a laptop
  won't.
- **Tradeoff:** small monthly cost (see `16-vps-deployment.md`); a 1–2 GB box is enough
  for V1 if Postgres is tuned modestly.

## Workspace dependency set (intended)

```toml
[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json", "rustls-tls", "stream"] } # SSE via stream
eventsource-stream = "0.2"            # MEV-Share SSE parsing
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "macros", "migrate", "json", "chrono", "rust_decimal"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
axum = "0.7"
metrics = "0.23"
metrics-exporter-prometheus = "0.15"
alloy = { version = "1", features = ["full"] }
dashmap = "6"
lru = "0.12"
anyhow = "1"
thiserror = "2"
async-trait = "0.1"
tokio-util = "0.7"                     # CancellationToken
rust_decimal = "1"                     # exact money math at the report boundary
```

(Pin exact patch versions in the real manifest.)
