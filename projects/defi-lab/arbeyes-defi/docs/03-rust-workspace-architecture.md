# 03 — Rust Workspace Architecture

## The full tree (everything that exists on day one)

```
rust-searcher-lab/
  Cargo.toml                 # [workspace] members = ["apps/*", "crates/*"]
  rust-toolchain.toml        # channel = "stable" (>= 1.85 for alloy 1.0)
  .gitignore
  config/
    local.toml.example
    vps.toml.example
  apps/
    cow-shadow-solver/
      Cargo.toml
      migrations/
        0001_init.sql
      src/
        main.rs              # tokio entry; wire config, telemetry, listener, health
        config.rs            # app config (env + TOML)
        cow_client.rs        # reqwest client for the orderbook API
        listener.rs          # poll loop, dedupe by auction id
        models.rs            # serde structs mirroring the openapi.yml
        normalizer.rs        # raw order -> NormalizedOrder
        scorer.rs            # CIP-38/65 per-order + per-solution score
        scorer_validation.rs # THE GATE: recompute winner score vs API
        routes.rs            # CoW /quote, UniV2 direct, UniV2 2-hop
        quote.rs             # quote adapters used by routes.rs
        ebbo.rs              # EBBO approximation + flagging
        compare.rs           # grade engine score vs winner -> tag
        reporter.rs          # `report daily` subcommand
        metrics.rs           # metric registration + recording helpers
        health.rs            # axum /health + /metrics
  crates/
    core/
      Cargo.toml
      src/
        lib.rs
        config.rs            # generic config loading (TOML + env overrides)
        telemetry.rs         # tracing-subscriber + prometheus exporter init
        chains.rs            # chain registry (id, name, base url, native symbol)
        tokens.rs            # token registry + decimals cache
        math.rs              # U256 helpers, native-price normalization
    evm/
      Cargo.toml
      src/
        lib.rs
        provider.rs          # alloy provider builder + retry/backoff
        erc20.rs             # sol! ERC-20 (decimals, symbol)
        univ2.rs             # sol! UniswapV2 Router getAmountsOut
    storage/
      Cargo.toml
      src/
        lib.rs
        sqlite.rs            # sqlx SqlitePool setup
        migrations.rs        # migration runner
  docs/
    cow-shadow-solver/       # this pack
```

There are **no** other `apps/*` folders, **no** `contracts/`, and **no** speculative
crates (`pnl`, `risk`, `routing`, `quoting`, `scoring`, `reporting`). Creating them
empty is a lie about what exists and the first step toward an over-abstracted repo.

## Workspace `Cargo.toml`

```toml
[workspace]
resolver = "2"
members = ["apps/cow-shadow-solver", "crates/core", "crates/evm", "crates/storage"]

[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "macros", "migrate"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
axum = "0.7"
metrics = "0.23"
metrics-exporter-prometheus = "0.15"
alloy = { version = "1", features = ["full"] }
anyhow = "1"
thiserror = "2"
config = "0.14"           # optional; or hand-roll TOML+env in core::config
```

(Pin exact patch versions in the real `Cargo.toml`; the above shows the intended set.)

## Crate responsibilities and why exactly three

| Crate | Purpose | Used by | Why a crate, not app code |
|-------|---------|---------|---------------------------|
| `core` | Config loading, telemetry init, chain registry, token registry + decimals cache, native-price/U256 math | every future product | These are identical across products and needed on day one. Genuine, immediate reuse. |
| `evm` | alloy provider + retry, ERC-20 and UniV2 `sol!` bindings | every future product | EVM access is the same everywhere; one copy of retry/backoff and bindings. |
| `storage` | sqlx SQLite pool + migration runner + append-only writer | every future product | DB setup/migrations are shared boilerplate worth centralizing immediately. |

Everything CoW-specific (client, models, normalizer, scorer, routes, compare) lives
**inside the app**, because it encodes one protocol's semantics and has no second
consumer. Forcing it behind a shared trait now would mean designing the abstraction for
an imaginary second case.

## Why other crates are NOT created yet

| Proposed crate | Verdict | Trigger to create it |
|----------------|---------|----------------------|
| `pnl` | DO NOT CREATE | First real consumer is Product 2 (OEV). P1 has "score," not PnL. |
| `risk` | DO NOT CREATE | First real consumer is Product 2. P1's risk surface is trivial (read-only). |
| `routing` | DO NOT CREATE | Extract only when a *second* product imports the same generator (Product 3). |
| `quoting` | DO NOT CREATE | Folds into the app for P1; extract on a second consumer. |
| `scoring` | DO NOT CREATE | CoW-specific; one consumer; stays in `apps/cow-shadow-solver/src/scorer.rs`. |
| `reporting` | DO NOT CREATE | P1 reporting is a CLI subcommand over SQLite; extract when ≥2 products share a format. |
| `config`, `telemetry` (as separate crates) | MERGE INTO `core` | Too small to justify their own crates. |

The rule: **abstraction follows the second real consumer, never precedes it.**

## Why one workspace, multiple binaries (later)

When future products arrive, each becomes its own `apps/*` binary sharing `core`/`evm`/
`storage`. Separate binaries (not subcommands of a monolith) let you run, restart, and
crash one product without touching another, and keep build times sane. On day one there
is exactly one binary.
