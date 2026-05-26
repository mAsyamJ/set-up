# DECISIONS.md — ArbEyes DeFi

Architectural gates derived from the doc pack. Amend here when intentionally changing course.

| ID | Decision | Rationale | Status |
|----|----------|-----------|--------|
| D1 | Product 1 = CoW **shadow** solver only | Validates skill vs public ground truth without bonding | Active |
| D2 | Gate blocks route code | Unvalidated scorer makes competitiveness meaningless | Active |
| D3 | Primary HTTP surface: `solver_competition` | Public; `/auction` may be permissioned | Active |
| D4 | Alloy for EVM | `ethers-rs` deprecated; matches CoW services | Active |
| D5 | SQLite + sqlx | Async-friendly logging; schema in `docs/12-storage-schema.md` | Active |
| D6 | No Product 1 flashloans / OEV / dashboard | `docs/18-do-not-build-yet.md` | Active |
| D7 | Comparison = score vs winner, not auction win | CIP-67 filter not reproducible from public bids | Active |

## Kill / pivot triggers

- Gate fails after honest debugging → stop route work; document and optionally use rank-correlation fallback from `docs/09-scorer-validation-gate.md`.
- Post-gate win-rate &lt; 2% over large sample → do not pursue CoW onboarding; keep artifact for portfolio / pivot to later products in roadmap docs.
