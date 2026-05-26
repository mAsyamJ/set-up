---
name: arbeyes-cow-shadow
description: ArbEyes Product 1 — CoW shadow solver gate-first rules and doc index
---

# ArbEyes — CoW shadow solver (Product 1)

Use this skill when working in `projects/defi-lab/arbeyes-defi/` on the Rust shadow solver.

## Invariants

1. **Gate before routes:** no `routes.rs` / `quote.rs` / `compare.rs` / `ebbo.rs` until `scorer_validation` passes documented thresholds (or explicit fallback in `docs/09-scorer-validation-gate.md`).
2. **No on-chain submission, no funds, no contracts** in Product 1 (`docs/18-do-not-build-yet.md`).
3. **Framing:** competitive = **my aggregate score vs winner’s score**; never claim combinatorial auction victory.
4. **Numbers:** `U256` / decimal string in DB; no `f64` in core.

## Doc index (read order for implementation)

- `docs/final-implementation-decision.md` — single-page verdict
- `docs/17-cursor-agentic-implementation-prompt.md` — paste-ready build order
- `docs/07-cow-client-spec.md`, `docs/06-data-models.md`, `docs/09-scorer-validation-gate.md`
- `docs/12-storage-schema.md`, `docs/16-test-plan.md`, `docs/14-vps-runbook.md`

## OpenSrc

Study `cowprotocol/services` via `.harness/research/opensrc-paths/` — mirror shapes, do not vendor the tree.
