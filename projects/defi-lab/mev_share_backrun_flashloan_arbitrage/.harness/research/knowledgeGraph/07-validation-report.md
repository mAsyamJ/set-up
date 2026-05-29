# Validation Report – Knowledge Graph vs V1 Hard Gates

**Date of last major validation pass:** 2026-05-28 (during full plan execution)

**Purpose:** Confirm that the accumulated understanding in this Knowledge Graph respects every non-negotiable V1 constraint.

## Gates Checked

### 1. Shadow-Only (No Live Execution in V1)
- **Status:** PASS
- Evidence: Every flow diagram, strategy description, and innovation entry explicitly states "no bundle submission, no signing, no contracts, no capital movement".
- Cross-references: `03-constraints-and-gates.md`, `05-innovation-opportunities.md` (all BUILD NOW items are shadow-only), P5–P11 descriptions.

### 2. Deterministic Risk Engine is Authoritative
- **Status:** PASS
- The Risk Engine section in `03-constraints-and-gates.md` is written as the single source of truth. No path (strategy, PnL, future ML, operator) is allowed to override it.
- All diagrams show Risk as the final gate before persistence.

### 3. Postgres as Source of Truth
- **Status:** PASS
- Storage flow in `02-data-flows-and-normalization.md` treats Postgres as the only durable store. In-memory caches are explicitly labeled "rebuildable".

### 4. Flashloans = Fee/Feasibility Model Only
- **Status:** PASS
- PnL section and all innovation entries treat flashloan cost as a pure number. No executor, callback, or contract interaction appears anywhere in BUILD NOW.

### 5. MEV-Share Only for Ethereum; L2s Use Public Block-Delta
- **Status:** PASS
- Collector flows in `02` clearly separate the three sources. No assumption of multi-chain MEV-Share.

### 6. One Rust Worker Binary (No Microservices in V1)
- **Status:** PASS
- Crate layout and phase mapping (06) enforce single binary + async tasks under one Tokio runtime.

### 7. BUILD Tier Discipline
- **Status:** PASS
- `05-innovation-opportunities.md` uses the three-tier tagging consistently. Nothing marked BUILD NOW violates the DO NOT BUILD YET list from the executive docs.

### 8. ML Rows Only (No Model in V1)
- **Status:** PASS
- `ml` crate is described everywhere as "feature row writer only". Training/serving is always tagged BUILD LATER.

## Known Gaps / Watch Items

- `paradigmxyz/artemis` not yet cloned → high-value modularity patterns missing from current provenance. (Tracked in OpenSrc failed list.)
- Accurate replay simulator not yet implemented → some simulation-related innovation items are still high-level.

## Conclusion

As of this pass, the Knowledge Graph is **consistent with all V1 hard gates**. Any future change to the graph or to the project that would violate these gates must first update this validation report and the source constraint documents.

This report should be re-run after every major KG regeneration or significant phase completion.
