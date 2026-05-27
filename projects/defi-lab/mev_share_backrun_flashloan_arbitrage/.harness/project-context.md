# MEV Share Backrun Flashloan Arbitrage — Project Context

## Product (V1)

**Rust Multi-Chain Backrun / Mispricing Shadow Searcher** — a single 24/7 Rust worker that scans Ethereum (via MEV-Share SSE), Base, and Arbitrum (via block-delta collectors) for long-tail v2-style backrun and mispricing opportunities. It normalizes events into one model, prices each with honest net-of-bribe PnL (including flashloan fees as a feasibility cost only), applies a deterministic risk gate, and logs whether the opportunity would have been profitable — **without submitting a single transaction or holding any capital**.

The output is a Postgres database of graded `candidate_opportunities` + `pnl_estimates` + `ml_features` across chains, plus daily comparison reports answering: *where, and how often, would an edge actually have survived realistic costs?*

Canonical product decisions live in `docs/00-executive-decision.md`, `docs/01-product-scope.md`, `docs/17-14-30-60-90-day-plan.md`, and `docs/20-agentic-coding-prompt.md`.

## Non-negotiables (V1 shadow scanner only)

1. **Shadow only** — no bundle submission, no signing, no funds, no contracts, no live execution path whatsoever in V1.
2. **Broad scanner, narrow executor** — multi-chain observation and evidence collection first; live execution (one chain + one strategy, tiny canary) is earned only after shadow data proves repeatable `survives_75` edge and is explicitly gated at Day 90+.
3. **Postgres is source of truth** — all persistent state (raw events, normalized, candidates, PnL, features). In-memory caches (dashmap/lru) are rebuildable; no Redis in V1.
4. **Deterministic risk engine is authoritative** — token denylist, liquidity, freshness, etc. block or downgrade candidates. Nothing (including future ML) may override it.
5. **Flashloans are modeled, never executed** — only fee/feasibility numbers in the PnL accountant (Balancer 0% first, Aave ~5bps second). No executor contract.
6. **One Rust worker binary** — not microservices. All collectors, decoder, strategy, PnL/risk, storage, metrics, and reporter run as async tasks under one Tokio runtime with bounded channels and backpressure.
7. **MEV-Share only for Ethereum**; Base and Arbitrum use public block-delta / swap-log collectors (shadow).
8. **Alloy, not ethers-rs** — modern Rust EVM stack.
9. **ML rows collected from day one, no model** — `ml` crate writes feature rows only; training/serving is BUILD LATER.
10. **Scope wall** — obey `docs/19-do-not-build-yet.md` and `docs/18-ml-and-redis-later.md`. No dashboards, no generic strategy frameworks, no v4 hooks, no live anything until evidence gates are passed.

## Planned workspace (when scaffolded)

Per `docs/20-agentic-coding-prompt.md`:

```
rust-searcher-lab/
  Cargo.toml (workspace), rust-toolchain.toml (stable >= 1.85)
  infra/docker-compose.yml          # Postgres ONLY
  config/{local,vps}.toml.example
  migrations/                       # sqlx Postgres migrations
  apps/searcher-worker/
  crates/
    core-types, config, storage, collectors, mevshare, chain-watchers,
    decoder, registry, state-reader, dex, strategy-api,
    strategies/backrun-v1, simulator, pnl, risk, cache, metrics, ml
```

Until `Cargo.toml` exists at the workspace root, `scripts/harness-verify.sh` must exit successfully with a docs/planning-phase message.

## OpenSrc (study only)

Study (do not vendor):
- `github.com/flashbots/simple-blind-arbitrage`
- `github.com/flashbots/mev-share` and `github.com/paradigmxyz/mev-share-rs`
- `github.com/alloy-rs/alloy`
- `github.com/foundry-rs/foundry`
- Uniswap v2/v3, Sushiswap v2, Aave v3, Balancer v2 references (for DEX adapter math and pool semantics).

Local clones tracked under `.harness/research/opensrc-paths/` when available. Pin relevant tags/shapes in comments when implemented.

## Verification

```bash
bash scripts/harness-verify.sh all
```

When the Rust workspace exists: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test` (offline by default; live calls env-gated).

## Kanban

- Board: `mev-share-backrun-v1`
- Workspace: absolute path to this directory (`dir:$AGENT_HARNESS_HOME/projects/defi-lab/mev_share_backrun_flashloan_arbitrage`)
