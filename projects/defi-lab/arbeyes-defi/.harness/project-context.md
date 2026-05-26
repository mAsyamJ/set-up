# ArbEyes DeFi — Project Context

## Product (Product 1)

**Read-only CoW Protocol shadow solver** in Rust (`apps/cow-shadow-solver` + `crates/core`, `crates/evm`, `crates/storage`). It grades a local scoring engine against **public** settled solver competitions — no bonding, no KYC, no settlement, no funds at risk.

Canonical product decisions live in `docs/00-decision.md`, `docs/02-product-scope.md`, and `docs/final-implementation-decision.md`.

## Non-negotiables

1. **Gate before routes:** implement `scorer` + `scorer_validation` (reproduce winner score within tolerance on 100+ auctions) before `routes.rs` / `quote.rs` / `compare.rs` / `ebbo.rs`.
2. **Public API first:** `get_solver_competition` / `latest` are the spine; `/auction` may be permissioned — the gate must not depend on it.
3. **Honest framing:** compare **my score vs winner’s reported score**, not “would have won” the combinatorial auction (CIP-67 filtering is not fully reproducible from public data).
4. **Integer money:** `U256` everywhere; SQLite stores amounts as TEXT; no `f64` in core paths.
5. **Scope wall:** obey `docs/18-do-not-build-yet.md` — no flashloans, OEV, dashboards, contracts, or generic strategy frameworks in P1.

## Planned workspace (when scaffolded)

- `rust-searcher-lab/` or repo root: workspace `Cargo.toml`, `apps/cow-shadow-solver`, `crates/*`, `config/*.toml.example`
- Until `Cargo.toml` exists, `scripts/harness-verify.sh` exits successfully with a docs-only message.

## OpenSrc (study only)

Study **`cowprotocol/services`** via paths under `.harness/research/opensrc-paths/` — mirror OpenAPI **shapes** into `models.rs`; do not vendor the monolith.

Refresh local clones with your org’s OpenSrc workflow (see `docs/source-learning.md`).

## Verification

```bash
bash scripts/harness-verify.sh all
```

When the Rust workspace exists: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`.

## Kanban

- Board: `arbeyes-defi-v1`
- Workspace: absolute path to this directory (`dir:$AGENT_HARNESS_HOME/projects/defi-lab/arbeyes-defi`)
