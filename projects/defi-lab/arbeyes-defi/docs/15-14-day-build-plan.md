# 15 — 14-Day Build Plan

Gate-first. Days 1–8 build toward the scorer validation gate. Route generation is not
written until the gate passes. Each day: **Build / Validate / Stop condition /
Deliverable.**

The implementation order is fixed:
`cow_client → models → storage → scorer + gate → daily report → routes → compare → monitoring`.

---

### Day 1 — Workspace + config + telemetry
- **Build:** `cargo new` workspace; `crates/core` (config, telemetry); `crates/storage`
  (pool, migration runner skeleton); app skeleton with `main.rs` wiring config + tracing.
- **Validate:** `cargo run` boots, logs structured JSON, loads `config/local.toml`.
- **Stop:** if the workspace doesn't compile clean, fix before anything else.
- **Deliverable:** booting binary that logs and exits cleanly.

### Day 2 — `cow_client.rs` (read path)
- **Build:** reqwest client; `get_solver_competition_latest` + `get_solver_competition(id)`
  first (these are public and power the gate); retry/backoff; 429 + 401/403 handling.
- **Validate:** fetch `solver_competition/latest` from mainnet; pretty-print the winner
  address + score. Confirm 401/403 path returns `Permissioned` without retry (mock test).
- **Stop:** if you cannot fetch a settled competition, stop — the gate is impossible
  without it.
- **Deliverable:** real settled competition JSON fetched and decoded.

### Day 3 — Data models + serde fixtures
- **Build:** `models.rs` mirroring the pinned openapi.yml; `u256_str` helpers.
- **Validate:** capture 10 real competition JSON bodies as fixtures; assert they
  deserialize losslessly (serde round-trip).
- **Stop:** if real payloads don't deserialize, the field mapping is wrong — fix against
  the pinned openapi before proceeding.
- **Deliverable:** fixtures + passing decode tests.

### Day 4 — Storage + persistence
- **Build:** `0001_init.sql`; `storage` writers; persist `raw_solver_competitions` and
  `normalized_orders`; one-transaction-per-auction.
- **Validate:** ingest the 10 fixtures into SQLite; query them back; WAL mode on.
- **Stop:** if writes aren't transactional/atomic, fix (a half-written auction corrupts
  analysis).
- **Deliverable:** competitions persisted and queryable.

### Day 5 — Normalizer + token decimals (evm crate)
- **Build:** `crates/evm` provider + ERC-20 `decimals`/`symbol`; `normalizer.rs`;
  decimals cache in `core::tokens`.
- **Validate:** normalize orders from fixtures; decimals resolved + cached (no double
  `eth_call`); liquidity-class orders flagged unsupported.
- **Stop:** if decimals can't be resolved for common tokens, fix RPC config.
- **Deliverable:** normalized orders for fixture auctions in the DB.

### Day 6 — Scorer (sell orders)
- **Build:** `scorer.rs` `score_order` for **sell** orders (integer `U256` math, native
  price applied).
- **Validate:** for fixture auctions whose winning solution is sell-only, recompute the
  winner score; compare to API. Log `abs_rel_error`.
- **Stop:** if sell-only auctions don't reproduce within ~1%, debug native-price scaling
  / mul-div order before touching buy orders.
- **Deliverable:** sell-order score reproduction working on the easy cases.

### Day 7 — Scorer (buy orders) + fees
- **Build:** buy-order scoring (`π` placement); attempt to source protocol fee `f`
  (start `f=0`, then refine if a fee-shaped gap appears).
- **Validate:** recompute across mixed sell/buy fixtures; bucket failures by
  `contains_buy_orders` / `contains_partial` / `multi_pair`.
- **Stop:** if buy-order auctions fail in a coherent bucket, re-derive the buy formula
  from the live docs.
- **Deliverable:** scorer handling both order kinds; failure buckets understood.

### Day 8 — THE GATE (`scorer_validation.rs`)
- **Build:** the full gate loop over **100+ settled auctions** pulled live; persist
  `winner_score_validations`; compute pass-rate within 1%.
- **Validate:** **≥80% within 1%** with failures explained by a coherent bucket.
- **Stop / DECISION POINT:**
  - **Gate passes →** proceed to Day 9.
  - **Gate fails after honest debugging →** STOP. Either invoke the kill criterion, or
    drop to the documented rank-correlation fallback gate (`09`) and *label everything as
    approximate*. Do not build route generation on a broken scorer.
- **Deliverable:** a pass/fail gate result with distribution + buckets. **This is the
  core deliverable of the project even if it fails.**

### Day 9 — Daily report (`reporter.rs`)
- **Build:** `report daily` subcommand: gate pass-rate, `abs_rel_error` distribution,
  coverage (orders supported vs skipped). `daily_rollups` upsert.
- **Validate:** report renders from the Day-8 data and matches hand-checked numbers.
- **Stop:** if report numbers disagree with raw tables, fix the aggregation.
- **Deliverable:** a real daily report you'd actually read.

### Day 10 — Route generation (`routes.rs` + `quote.rs`) — POST-GATE
- **Build:** CoW `/quote` baseline + UniV2 direct + UniV2 2-hop; candidate assembly;
  best-per-order selection scored via the validated scorer.
- **Validate:** generate candidates for live auctions; quotes succeed; chosen venue is
  the higher-surplus one for sell orders.
- **Stop:** if quotes are unreliable, fix RPC/quote handling before grading.
- **Deliverable:** candidates persisted with scores.

### Day 11 — Comparison (`compare.rs`) + EBBO/risk
- **Build:** sum my best per-order score; compare to winner; tag
  `Competitive|Marginal|NotCompetitive`; EBBO flag + risk bands.
- **Validate:** grade several hundred settled auctions; sanity-check a handful by hand.
- **Stop:** if "competitive" tags don't survive manual re-check, the comparison or scorer
  is lying — fix.
- **Deliverable:** `auction_comparisons` populated; first real win-rate number.

### Day 12 — Monitoring + health + metrics
- **Build:** axum `/health` + `/metrics`; all counters/histograms from `13`; optional
  Telegram alert.
- **Validate:** `curl /metrics` shows live counts; `/health` flips to degraded when the
  API is unreachable (simulate).
- **Stop:** if metrics don't move with activity, fix wiring.
- **Deliverable:** observable engine.

### Day 13 — VPS deploy + 72h soak start
- **Build:** deploy per `14`; systemd service; backup timer; start the soak.
- **Validate:** engine processes live auctions unattended; backup runs; logs queryable.
- **Stop:** if it crashes/leaks, fix before counting the soak.
- **Deliverable:** running on the VPS, soak clock started.

### Day 14 — Analysis + decision
- **Build:** nothing. Aggregate the run.
- **Validate:** per-pair win-rate, p50/p95 gap, gate pass-rate, EBBO-violation rate,
  coverage.
- **Decision (pick one):**
  1. Continue toward CoW solver onboarding (only if win-rate is compelling vs the bond).
  2. Continue improving the shadow solver (add v3/Balancer/Curve routing).
  3. Pivot to Product 2 (OEV/SVR watcher) for more accessible PnL.
  4. Pivot to Product 3 (backrun scanner).
  5. Keep as a portfolio artifact; pause PnL pursuit.
  6. Kill the path.
- **Deliverable:** a written decision memo backed by the database.

---

## Milestone gates (hard)

- **End of Day 8:** scorer validation gate result. No route code before this passes.
- **End of Day 11:** first honest competitiveness number.
- **End of Day 14:** data-backed go/no-go.
