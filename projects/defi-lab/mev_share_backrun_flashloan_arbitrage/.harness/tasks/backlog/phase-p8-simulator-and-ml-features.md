# P8 — Fast-estimate simulator and feature rows

## Goal

`simulator` crate with `Simulator` trait + `FastEstimateSim` (closed-form) implementation now. `ForkReplaySim` is a later interface only. `ml` crate writes `ml_features` rows (no model, no training, no serving).

## Acceptance

- [ ] Fast-estimate path exercised for candidates; results feed PnL
- [ ] `ml_features` table receives one row per scored opportunity with the documented feature set
- [ ] No model code or training pipelines exist in the workspace
- [ ] Simulator trait allows swapping in accurate replay later without touching callers

## Owner

Rust Core
