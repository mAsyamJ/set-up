# P5 — Backrun v1 strategy API and implementation

## Goal

`Strategy` trait in `strategy-api` + first impl `backrun-v1` that, given a `NormalizedEvent` + context, emits `CandidateOpportunity` rows (shadow "build" produces a plan object, never sendable calldata or signed bundle).

## Acceptance

- [ ] First `CandidateOpportunity` rows (with scores) appear in Postgres from live or backfilled events on at least one chain
- [ ] Strategy is pluggable; adding a second family later touches only the new impl + registration
- [ ] No live execution surface exists (no bundle builder, no signer, no submission code)

## Owner

Rust Core
