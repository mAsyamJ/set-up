# P4 — Normalizer + EVM

## Goal

ERC-20 decimals cache; `normalizer.rs` per `docs/08-normalizer-spec.md`; flag unsupported liquidity classes.

## Acceptance

- [ ] No duplicate `eth_call` for same token in a single auction pass
- [ ] Normalized rows for fixture set in DB

## Owner

Rust EVM + Rust Core
