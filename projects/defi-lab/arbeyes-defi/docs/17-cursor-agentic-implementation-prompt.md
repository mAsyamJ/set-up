# 17 — Cursor Agentic Implementation Prompt

Paste the block below into Cursor to start implementation. It enforces gate-first order
and the do-not-build boundary.

---

````
You are implementing ONE product from the docs in docs/cow-shadow-solver/. Read those
docs as the source of truth. Implement EXACTLY the scope below, in the EXACT order below.

PRODUCT: apps/cow-shadow-solver — a read-only CoW Protocol shadow solver in Rust.
It fetches settled CoW solver competitions, recomputes the winning settlement score from
public data (the validation GATE), and only after the gate passes, generates simple
candidate routes and grades them against the winner. SHADOW ONLY: no on-chain submission,
no funds, no contracts.

WORKSPACE (create exactly this — NOTHING MORE):
  rust-searcher-lab/
    Cargo.toml                # workspace: members apps/cow-shadow-solver, crates/core, crates/evm, crates/storage
    rust-toolchain.toml       # stable, >= 1.85 (alloy 1.0)
    config/local.toml.example, config/vps.toml.example
    crates/core/   (config.rs, telemetry.rs, chains.rs, tokens.rs, math.rs)
    crates/evm/    (provider.rs, erc20.rs, univ2.rs)
    crates/storage/(sqlite.rs, migrations.rs)
    apps/cow-shadow-solver/
      migrations/0001_init.sql      # use the schema in docs 12 verbatim
      src/{main,config,cow_client,listener,models,normalizer,scorer,scorer_validation,
           routes,quote,ebbo,compare,reporter,metrics,health}.rs

DEPENDENCIES: tokio, reqwest(json,rustls-tls), serde+serde_json, sqlx(runtime-tokio,
sqlite,macros,migrate), tracing+tracing-subscriber(json,env-filter), axum, metrics+
metrics-exporter-prometheus, alloy(full), anyhow, thiserror. Use alloy, NOT ethers-rs.

IMPLEMENTATION ORDER (do not deviate):
  1. Workspace + crates/core (config + telemetry) + app main.rs that boots, logs JSON,
     loads config, exits clean.
  2. crates/storage (SqlitePool, WAL, migration runner) + migrations/0001_init.sql from doc 12.
  3. models.rs — serde structs mirroring docs 06 (camelCase, U256-as-decimal-string helper).
     PIN the openapi tag you mirror; add a comment with the exact tag/commit.
  4. cow_client.rs — reqwest client per doc 07. Implement get_solver_competition_latest
     and get_solver_competition(id) FIRST (public, power the gate). Retry/backoff, 429,
     and 401/403 -> Permissioned (no retry). get_current_auction may return Permissioned;
     the gate must NOT depend on it.
  5. Serde fixture tests (doc 16 layer 2) using real captured JSON in tests/fixtures/.
  6. crates/evm (provider + erc20 decimals/symbol) + normalizer.rs (doc 08). Cache decimals.
  7. scorer.rs — score_order for SELL first (doc 09 integer math, native price via
     Auction.prices, mul-before-div). Then BUY orders + attempt protocol fee (start f=0).
  8. scorer_validation.rs — THE GATE (doc 09): recompute the winning settlement score over
     100+ settled auctions; persist winner_score_validations; compute pass-rate within 1%.
     Bucket failures by contains_buy_orders / contains_partial / multi_pair.
  9. reporter.rs — `report daily` subcommand (doc 15 Day 9): gate pass-rate, abs_rel_error
     distribution, coverage; upsert daily_rollups.

  >>> HARD STOP: do NOT implement routes.rs / quote.rs / compare.rs / ebbo.rs until the
      gate passes (>=80% within 1% on 100+ auctions, failures explained). If the gate
      cannot pass, STOP and report; optionally implement the doc-09 rank-correlation
      fallback gate, clearly labeled approximate. <<<

 10. routes.rs + quote.rs (doc 10) — CoW /quote baseline, UniV2 direct, UniV2 2-hop only.
 11. ebbo.rs + risk (doc 11), compare.rs (grade my score vs winner -> tag).
 12. metrics.rs + health.rs (doc 13) — all listed counters/histograms; axum /health + /metrics
     on 127.0.0.1.

CONSTRAINTS — DO NOT:
  - create any other apps/* folder (no oev, backrun, flashloan, v4-hook, dashboard).
  - create crates pnl/risk/routing/quoting/scoring/reporting (keep that logic in the app).
  - create empty future folders.
  - implement live solver submission, funds, smart contracts, flashloans, OEV, or MEV-Share.
  - hit the network in unit/CI tests (use wiremock/httpmock + fixtures). Live calls go in
    a separate, env-gated integration suite.
  - parse amounts as f64. Use U256 everywhere; floats only at the report boundary.

QUALITY BARS:
  - cargo fmt + clippy -D warnings clean.
  - The scorer validation regression suite (doc 16 layer 6) is a REQUIRED test.
  - Every U256 amount/score stored as TEXT in SQLite.
  - One transaction per auction when persisting.

START NOW with steps 1–4 and the fixture decode tests. After step 8, print the gate
pass-rate and STOP for my review before writing any route code.
````

---

## Notes for the operator (you, not Cursor)

- Before running Cursor, capture 20+ real settled-competition JSON bodies into
  `tests/fixtures/competitions_gate_set/` (a one-off manual script hitting the live API).
  The gate regression test needs them and CI must not fetch them.
- Pin the openapi tag in `models.rs` and in `01-research-sources.md`. When CoW bumps the
  schema, the fixture decode tests break first — that's the intended early warning.
- Resist the urge to let Cursor "just add v3 routing" or "a quick dashboard." Those are
  Day-14 decisions at the earliest, and only if the data asks for them.
