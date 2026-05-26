# P1 — Workspace boot

## Goal

Rust workspace per `docs/03-rust-workspace-architecture.md` + `docs/17-…`: members `apps/cow-shadow-solver`, `crates/core`, `crates/evm`, `crates/storage`; `rust-toolchain.toml`; config examples; app boots with tracing and exits clean.

## Acceptance

- [ ] `cargo fmt` + `cargo check` clean
- [ ] `bash scripts/harness-verify.sh all` runs real checks (no longer docs-only skip)

## Owner

Rust Core
