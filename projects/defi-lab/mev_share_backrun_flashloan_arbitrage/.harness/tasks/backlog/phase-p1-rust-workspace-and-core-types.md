# P1 — Rust workspace skeleton and core types

## Goal

Cargo workspace + rust-toolchain + core-types crate (`NormalizedEvent`, `EventKind`, `ChainId`, money newtypes, enums per docs 06) + config crate (env + TOML) boot cleanly.

## Acceptance

- [ ] `rust-searcher-lab/Cargo.toml` workspace declares all planned crates/apps (no extras)
- [ ] `rust-toolchain.toml` pins stable >= 1.85
- [ ] `core-types` compiles with the exact shapes from `docs/06-event-normalization.md`
- [ ] `config` loads from example TOML + env with sensible defaults for local vs VPS
- [ ] `cargo check` (or `cargo fmt && cargo clippy -- -D warnings`) clean on the skeleton

## Owner

Rust Core
