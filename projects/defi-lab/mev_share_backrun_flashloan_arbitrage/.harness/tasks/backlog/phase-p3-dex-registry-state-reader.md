# P3 — v2 DEX adapters, registry, state reader

## Goal

UniswapV2/SushiV2 `DexAdapter` trait + impls (pure U256 closed-form quotes), Postgres + dashmap-backed `registry`, and `state-reader` (latest reserves + snapshots + explicit freshness flag) for v2-style pools.

## Acceptance

- [ ] `dex` crate provides `DexAdapter` and correct integer math for the two v2 forks
- [ ] `registry` can be seeded (factory PairCreated logs or curated list) per chain and exposes by_address / by_pair
- [ ] `state-reader` returns reserves + a staleness flag; stale pools are clearly marked
- [ ] Fixtures prove quote math and registry round-trips without RPC in unit tests

## Owner

Rust EVM + Rust Core
