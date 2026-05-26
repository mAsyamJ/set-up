# 16 — Test Plan

Tests exist to protect the one thing that matters: **the score the engine computes is
the score CoW computes.** Everything else is plumbing around that. No network in CI; live
calls are a separate, env-gated integration suite.

## Test layers

### 1. Unit tests
- **`core::math`**: `U256` mul-before-div helpers; native-price scaling (`amount * price
  / 1e18`); rounding direction. Property test: `value_native(amount, 1e18) == amount`.
- **`scorer`**: `score_order` for sell and buy with hand-computed expected values on tiny
  synthetic orders (e.g. sell 1.0 A for ≥0.9 B, executed 1.0 B → surplus 0.1 B → score =
  0.1·p). Cover: zero surplus, negative surplus (under-fill) clamped/flagged, buy vs sell.
- **`normalizer`**: kind classification, liquidity-class skip, expired skip, zero-amount
  skip, decimals-cache hit.
- **`risk`/`ebbo`**: reverting quote → reject band; denylist token → reject; candidate
  worse than baseline → `ebbo_violation`.

### 2. Serde fixture tests
- Real captured JSON for `Auction`, `SolverCompetition`, `Order`, `quote` responses
  deserialize into `06` structs **losslessly** (decode, re-encode, compare semantically).
- Catches openapi drift early: when a field renames/moves, these tests break first.

### 3. API mock tests (`wiremock`/`httpmock`)
- `cow_client` requests correct paths/params.
- **429** → backoff + retry (assert attempt count via a controllable clock or counter).
- **401/403** → `Permissioned`, no retry.
- Malformed body → `Decode` with truncated raw body captured.
- Timeout → `Timeout` and retry within max attempts.

### 4. SQLite migration tests
- Apply `0001_init.sql` to an in-memory SQLite; assert all tables + indexes exist.
- Insert + read-back round-trips for each table; `U256`-as-TEXT preserves exact value.
- One-transaction-per-auction: a forced mid-write failure rolls back the whole auction.

### 5. Scorer formula tests (the core)
- Golden synthetic cases with hand-derived scores (sell + buy + mixed).
- Native-price application correctness against a known `Auction.prices` map.

### 6. Scorer validation regression tests (the gate, offline)
- Bundle **≥20 real settled-auction fixtures** spanning sell-only, buy-containing,
  partial-fill, and multi-pair cases.
- Run the full `recompute_solution_score` against each; assert the **aggregate pass-rate
  ≥80% within 1%** on the fixture set. This is the gate, runnable offline in CI.
- When the gate logic changes, this suite is the safety net: a regression that drops the
  pass-rate fails CI.
- Keep a few **known-hard** fixtures (e.g. a multi-pair batch with buy orders) as
  explicit cases so a future change can't silently re-break them.

### 7. Route generation tests (post-gate; integration, env-gated)
- UniV2 direct quote for a pinned block/pair returns a plausible amount.
- 2-hop with a missing middle pool → `ok=false`.
- Candidate selection picks higher-surplus venue for a sell order.
- Buy order yields a flagged approximate candidate (not a drop).

### 8. Daily report tests
- Given a seeded DB, the rollup numbers (pass-rate, competitive counts, p50/p95 gap)
  match independently computed values.

### 9. Error-handling tests
- RPC provider error → `cow_rpc_errors` increments; quotes degrade; gate still runs from
  competition data.
- DB locked/disk-full simulation → `cow_db_errors`; `/health` db != ok.
- CoW API unreachable → `last_auction_age_s` climbs; `/health` degraded.

## Suggested fixture files

```
apps/cow-shadow-solver/tests/fixtures/
  auction_mainnet_sample.json
  solver_competition_latest.json
  solver_competition_sell_only.json
  solver_competition_with_buy.json
  solver_competition_partial_fill.json
  solver_competition_multi_pair.json
  order_sell.json
  order_buy.json
  quote_response.json
  competitions_gate_set/         # >=20 real settled competitions for the gate regression
    0001.json ... 0020.json
```

Capture fixtures with a small one-off script that hits the live API once and saves
bodies verbatim (run manually, commit the JSON). Never let CI hit the network.

## CI gates

- `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test` (offline only).
- The **scorer validation regression suite (layer 6) is a required CI check** — it is the
  programmatic embodiment of the project's core gate.
