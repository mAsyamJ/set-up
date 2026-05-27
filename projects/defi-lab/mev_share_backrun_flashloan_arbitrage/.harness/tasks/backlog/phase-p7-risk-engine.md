# P7 — Deterministic risk engine

## Goal

`risk` crate is the single source of truth for go/no-go: token denylist/FoT/rebasing flags, liquidity thresholds, state freshness, sim confidence. Outputs Pass / Downgrade / Reject. Authoritative — no downstream component (including future ML) may override.

## Acceptance

- [ ] Every candidate receives an explicit risk tag before persistence
- [ ] Downgraded and rejected opportunities are still fully logged (for analysis)
- [ ] Risk rules are expressed in one place with clear, auditable conditions
- [ ] QA regression exists that would catch accidental bypass

## Owner

Rust Core + QA Gate
