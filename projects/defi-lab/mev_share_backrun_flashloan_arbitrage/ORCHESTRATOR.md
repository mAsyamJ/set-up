# ORCHESTRATOR.md — MEV Share Backrun Flashloan Arbitrage Engineering Plan

## Objective

Stand up the **V1 multi-chain shadow scanner** described in `docs/`: one 24/7 Rust worker (Postgres-backed) that proves (or disproves) the existence of a net-of-bribe backrun/mispricing edge across Ethereum, Base, and Arbitrum before any live execution is even considered. Harness tasks, Kanban (`mev-share-backrun-v1`), and agents each own a narrow slice. All work respects the hard gates in `docs/17-14-30-60-90-day-plan.md` and the V1 contract in `docs/20-agentic-coding-prompt.md`.

**No live execution before the Day-60 replay gate, and only a tiny conditional canary after Day-90 evidence review.**

## Phase map (maps to `docs/17-14-30-60-90-day-plan.md` and `docs/20-agentic-coding-prompt.md`)

| Phase | Focus | Owner agent | Stop condition |
|-------|-------|-------------|----------------|
| P0 | Harness registration, OpenSrc tracking, docs-only verify | Orchestrator | Registry + manifest + this contract + backlog tasks exist; `harness-verify.sh all` exits 0 on docs-only tree |
| P1 | Rust workspace skeleton + core types (`NormalizedEvent`, enums, newtypes) + config | Rust Core | `cargo check` on workspace + core-types; config loads from TOML + env |
| P2 | Postgres + migrations + storage writer (batched async, never blocks ingest) | Rust Core | WAL Postgres via Docker Compose; `migrate` on startup; raw + normalized writes succeed under backpressure |
| P3 | v2 DEX adapters (UniswapV2/SushiV2 closed-form U256), registry (Postgres + dashmap), state reader (reserves + freshness) | Rust EVM + Rust Core | Registry seeded for curated long-tail WETH pairs per chain; state reads are fresh or explicitly stale-tagged |
| P4 | Ethereum MEV-Share SSE collector (+ hint backfill) + Base/Arbitrum block-delta collectors; decoder to `NormalizedEvent` | Rust Core + Rust EVM | Collectors run, reconnect, dedup, backfill; events appear in Postgres and on the internal channel for ≥1 chain + 1 L2 |
| P5 | `strategy-api` trait + `backrun-v1` implementation (detect/score; shadow "build" returns a plan, never sendable calldata) | Rust Core | First `CandidateOpportunity` rows with scores appear in DB from live or backfilled events |
| P6 | PnL accountant (net = gross − gas − bribe − flashloan_fee − dex_fees − slippage − ...) + flashloan **fee** feasibility model only | Rust Core | `pnl_estimates` rows with `survives_50/75/90` flags; flashloan fee treated as cost, never executed |
| P7 | Deterministic risk engine (token denylist/FoT/rebasing, liquidity, staleness, sim confidence; Pass/Downgrade/Reject — AUTHORITATIVE) | Rust Core + QA Gate | Risk tags applied; no path can bypass the gate; downgraded/rejected candidates still logged |
| P8 | Fast-estimate simulator (closed-form now) + `Simulator` trait placeholder; feature-row writer for `ml_features` | Rust Core | Simulator interface exercised; `ml_features` rows populated alongside candidates (no model code) |
| P9 | Metrics (Prometheus localhost), tracing (JSON → journald), Telegram alerts, `/health` + `/metrics` | Observability | `/metrics` moves with traffic; alerts fire on collector lag or error spikes; runbook exists |
| P10 | Daily cross-chain comparison report (per-chain/pair survival after 75% bribe capture, risk flag impact, etc.); VPS + systemd packaging | Rust Core + Observability | Daily report renders from Postgres aggregates; worker runs ≥72h unattended on VPS without crash/leak |
| P11 | Evidence review and live-execution gate decision | Orchestrator + all | After sustained soak: either (a) coherent repeatable `survives_75` clusters + replay validation → plan tiny canary (Day 61-90 gated), or (b) no edge → document pivot or sunset. No live work without explicit gate pass. |

**Hard gates (from `docs/17-14-30-60-90-day-plan.md`):**
- Day 14 / P4–P7 complete: 24/7 multi-chain shadow producing graded candidates.
- Day 30 / P10 stable: repeatable `survives_75` cluster identified on at least one chain/pair/strategy, or pivot before investing further.
- Day 60 / P8 + accurate replay (LATER): one niche clears go/no-go on fork replay (median err ≤10%, etc.), or no live.
- Day 90 / P11: tiny live canary **only if** Day-60 gate passed; otherwise remain pure shadow.

No phase may skip its gate. Live execution is earned by evidence.

## Verify commands

```bash
bash scripts/harness-verify.sh all
```

(When Rust workspace exists: the script will also run `cargo fmt --check`, `clippy -D warnings`, `cargo test`.)

## Kanban

Board **`mev-share-backrun-v1`** — workspace `dir:<absolute path to projects/defi-lab/mev_share_backrun_flashloan_arbitrage>`.

Bootstrap board (once per machine):

```bash
AGENT_HARNESS_HOME=~/dev/Project/agent-harness \
  bash "$AGENT_HARNESS_HOME/scripts/kanban-init-project-board.sh" mev-share-backrun-flashloan-arbitrage
```

## OpenSrc

Maintain `.harness/opensrc-packages.txt` and any resolved `.harness/research/opensrc-paths/*.path` entries for the study sources listed in `project-context.md` (Flashbots MEV-Share family, Alloy, Foundry, reference DEXes).

Pin relevant upstream tags or shapes in code comments when the corresponding crate is implemented.
