# Core Constraints and Hard Gates (V1)

This document is the **authoritative reference** for every scope, architecture, and implementation decision. All nodes in the knowledge graph and all future work must be consistent with these rules.

## 1. Fundamental Product Identity

- **V1 is a multi-chain shadow scanner only.**
- Output = evidence in Postgres (graded opportunities + PnL + features + reports).
- **No live execution whatsoever** in V1 (no bundle submission, no signing, no contracts, no capital at risk).

Source: `docs/00-executive-decision.md`, `docs/01-product-scope.md`, `docs/19-do-not-build-yet.md`

## 2. Non-Negotiable Architectural Rules

| Rule | Enforcement | Violation Consequence |
|------|-------------|-----------------------|
| Shadow-only | No `mev_sendBundle`, no private key usage, no contract deployment | Immediate scope violation |
| One Rust worker binary | All collectors, decoder, strategy, PnL, risk, storage, metrics, reporter run under single Tokio runtime | Do not introduce microservices |
| Postgres is source of truth | All durable state lives in Postgres. In-memory caches (dashmap/lru) are rebuildable | Never rely on Redis for correctness in V1 |
| Deterministic Risk Engine is authoritative | Risk decisions (Pass/Downgrade/Reject) cannot be overridden by strategy, PnL, ML, or operator | Any bypass path is a bug |
| Flashloans are fee/feasibility modeling only | Flashloan cost is a number in the PnL model. No executor, no callback, no contract interaction | Live flashloan code is forbidden in V1 |
| MEV-Share only for Ethereum | Base & Arbitrum use public block-delta collectors | Do not assume or implement multi-chain MEV-Share |

## 3. Explicit "DO NOT BUILD YET" List (V1)

From `docs/19-do-not-build-yet.md` and `docs/18-ml-and-redis-later.md`:

- Live bundle sender / `mev_sendBundle`
- Any flashloan executor contract or live flashloan path
- Redis (hot-path cache)
- ML model training or serving (feature collection only is allowed)
- Web dashboards or admin APIs
- Microservices / Kubernetes
- Self-hosted archive nodes
- Uniswap v4 hook-aware strategies (in V1)
- Generic public flashloan arbitrage (focus on long-tail v2 backrun first)
- Deep learning / complex models

## 4. Success / Kill Gates (from Executive Decision)

**Success (Day 14+ soak):**
- Worker runs ≥72h unattended on cheap VPS
- Postgres accumulates graded opportunities across ≥3 chains
- Daily report shows per-chain/DEX/pair `survives_75` counts

**Kill / Pivot Triggers:**
- After sustained multi-chain data: **no coherent, repeatable cluster** of opportunities that survive 75% bribe capture → do **not** build execution. Pivot or sunset.
- Accurate replay (later phase) shows fast-estimate is lying → fix estimator or stop before live work.

## 5. Build Tier Discipline

Every component, idea, or external pattern referenced in this KG **must** carry one of:

- **BUILD NOW** — part of the V1 24/7 VPS slice (shadow scanner)
- **BUILD LATER** — target architecture, deferred until evidence justifies
- **DO NOT BUILD YET** — explicitly out of scope for the foreseeable future

This tagging must be visible in `05-innovation-opportunities.md` and respected in all phase planning.

## 6. Data & Money Invariants

- All token amounts, scores, and PnL fields are `U256` (or `NUMERIC(78,0)` in Postgres).
- Floats are allowed **only** at report boundaries.
- Event ingestion must never block on downstream work (bounded channels + drop-to-DB with counters on backpressure).

## 7. Agent / Human Contract

Any proposal that would violate any rule in this document must:
1. Explicitly call out the violation.
2. Propose a formal change to this document (and the source docs it derives from).
3. Be rejected by default unless the change is accepted.

---

This file is the "constitution" of the project. The rest of the knowledge graph exists to help us build **correctly** within these hard boundaries.
