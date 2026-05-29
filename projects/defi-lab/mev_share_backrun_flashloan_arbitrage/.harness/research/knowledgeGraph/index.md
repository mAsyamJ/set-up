# MEV Share Backrun Flashloan Arbitrage — Knowledge Graph Index

**Project:** `projects/defi-lab/mev_share_backrun_flashloan_arbitrage`  
**V1 Goal:** Multi-chain shadow scanner (Ethereum MEV-Share + Base/Arbitrum block-delta) that proves (or disproves) the existence of repeatable net-of-bribe backrun/mispricing edge before any live execution.

This directory is the **single source of truth** for deep understanding, architecture decisions, constraints, and innovation opportunities.

## Quick Navigation (Full KG Generated)

- [00-raw-knowledge-graph.json](00-raw-knowledge-graph.json) — Placeholder for plugin output (user ran `/understand` on `.harness/research/`)
- [01-plugin-status.md](01-plugin-status.md) + [RUN-COMMANDS.md](RUN-COMMANDS.md)
- [02-data-flows-and-normalization.md](02-data-flows-and-normalization.md) — The beating heart of the system
- [03-constraints-and-gates.md](03-constraints-and-gates.md) — **Read this first** (V1 constitution)
- [04-opensrc-provenance.md](04-opensrc-provenance.md) — Detailed analysis of 15+ cached research repos
- [05-innovation-opportunities.md](05-innovation-opportunities.md) — BUILD-tiered ideas with concrete external sources
- [06-phase-architecture-mapping.md](06-phase-architecture-mapping.md) — P0–P11 to crates + KG
- [07-validation-report.md](07-validation-report.md) — Proof the KG respects every hard gate

## Top-Level Architecture (V1 Shadow Scanner)

```mermaid
flowchart TD
    subgraph Collectors
        A[MEV-Share SSE\nEthereum] 
        B[Block-Delta\nBase]
        C[Block-Delta\nArbitrum]
    end

    D[Decoder / Normalizer] --> E[NormalizedEvent]

    E --> F[Strategy Engine\n(backrun-v1 only in V1)]

    F --> G[PnL Accountant\n+ Flashloan Fee Model]

    G --> H[Deterministic Risk Engine\nPass / Downgrade / Reject]

    H --> I[Postgres Evidence Store\ncandidate_opportunities + pnl_estimates + ml_features]

    I --> J[Daily Cross-Chain Reports]
    I --> K[Prometheus Metrics + Health + Telegram Alerts]

    style H fill:#ffcccc,stroke:#aa0000
    style I fill:#ccffcc,stroke:#006600
```

**Core Invariant (V1):** Nothing after the Risk Engine may override a Reject. No live bundle submission, signing, contracts, or capital movement.

## How to Work With This KG

1. Always read `03-constraints-and-gates.md` before proposing any new code or scope.
2. When exploring external ideas, start in `04-opensrc-provenance.md`.
3. When planning the next phase, consult `06-phase-architecture-mapping.md`.
4. Innovation proposals must be tagged in `05-innovation-opportunities.md` with the correct BUILD tier.

## Regeneration Instructions

1. Run the Understand-Anything plugin on the project (especially `.harness/research/` and `docs/`):
   - `/understand`
   - `/understand-knowledge .workspace/DeFiMEVLearn.md`

2. Copy the resulting `knowledge-graph.json` into this directory as `00-raw-knowledge-graph.json`.

3. Re-run any synthesis or validation passes as needed (the structured MD files in this directory are the primary working artifacts for agents and humans).

See [RUN-COMMANDS.md](RUN-COMMANDS.md) for the exact commands used during initial creation.

---

**This Knowledge Graph is now a first-class, versioned artifact of the project.**

*Full generation completed during "do everything" execution of the attached plan – May 28, 2026.*
