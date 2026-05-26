# Technical Decisions

Format: **Decision / Reason / Tradeoff.** These resolve the open choices so Cursor doesn't
re-litigate them.

### 1. Rust workspace layout
- **Decision:** one workspace; one app (`cow-shadow-solver`) + three crates (`core`,
  `evm`, `storage`).
- **Reason:** genuine day-one reuse is only config/telemetry/EVM/storage; CoW logic has
  no second consumer.
- **Tradeoff:** later products may force a re-cut of boundaries — accepted, because
  cutting them now would guess wrong.

### 2. SQLite vs Postgres
- **Decision:** SQLite, one file per product.
- **Reason:** single writer, low volume, zero-ops, trivial backup.
- **Tradeoff:** no cross-product SQL until a future Postgres migration — fine, that need
  doesn't exist yet.

### 3. sqlx vs rusqlite
- **Decision:** `sqlx` (sqlite feature).
- **Reason:** async-native (fits tokio), compile-time-checked queries, built-in
  migrations.
- **Tradeoff:** heavier than `rusqlite` and needs `DATABASE_URL` at build for macro
  checks (use offline mode/`sqlx prepare`); acceptable for stack consistency.

### 4. alloy vs ethers-rs
- **Decision:** `alloy`.
- **Reason:** ethers-rs is officially deprecated; alloy is the successor, faster at
  U256/ABI, and is what `cowprotocol/services` uses.
- **Tradeoff:** alloy 1.0 needs Rust ≥ 1.85 — pinned in `rust-toolchain.toml`.

### 5. reqwest polling vs websocket
- **Decision:** reqwest polling.
- **Reason:** the orderbook API is REST; there's no public auction websocket; shadow mode
  has no 15s pressure.
- **Tradeoff:** ~3s latency to see a new auction — irrelevant since we grade settled
  auctions, not race them.

### 6. CoW `/quote` vs direct DEX quote first
- **Decision:** CoW `/quote` is the baseline; UniV2 direct/2-hop are the "own routing"
  candidates.
- **Reason:** `/quote` is one verified call and a fair yardstick; if our routing can't
  match it, it adds no value.
- **Tradeoff:** `/quote` is a dependency on CoW's estimator — fine as a reference, not as
  the only candidate.

### 7. Uniswap v2 first
- **Decision:** yes, v2 only in the first pass.
- **Reason:** `getAmountsOut` is a cheap pure view; simplest correct route.
- **Tradeoff:** misses concentrated/v3-v4/Balancer/Curve liquidity — added only if data
  justifies.

### 8. Implement v3/v4 now
- **Decision:** no.
- **Reason:** scope control; quoting v3/v4 off-chain is more work and unjustified
  pre-gate.
- **Tradeoff:** lower coverage initially — measured as "no_v2_route" skips, revisited at
  Day 14.

### 9. Build a dashboard
- **Decision:** no web dashboard. CLI report + Prometheus + optional Telegram.
- **Reason:** cheap, sufficient, no front-end maintenance.
- **Tradeoff:** less pretty — irrelevant for a validation instrument.

### 10. Self-host a node
- **Decision:** no; use a public/paid RPC.
- **Reason:** a $10–$30 VPS can't host an archive node; not needed for read/quote.
- **Tradeoff:** RPC latency/limits — fine for shadow; revisit only if measured to cost
  competitiveness.

### 11. Use `cowprotocol/services` as a dependency or learning source
- **Decision:** **learning source only**; do not depend on or vendor it.
- **Reason:** it's a large production system (GPL-3.0); we want a small, owned codebase.
- **Tradeoff:** we re-implement small pieces (client, scorer) — that's the point; the
  re-implementation *is* the learning and the gate validates it.

### 12. Route generation before scoring validation
- **Decision:** **no — gate first, always.**
- **Reason:** a route's score is meaningless if the scorer is unproven.
- **Tradeoff:** route code waits until Day 10 — correct sequencing, not a delay.
