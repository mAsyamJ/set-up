# Phase Architecture Mapping (P0–P11 to Components & Knowledge Graph)

This document maps the official 14/30/60/90-day plan (from `docs/17-14-30-60-90-day-plan.md` and `docs/20-agentic-coding-prompt.md`) onto the Knowledge Graph entities and the actual crate/workspace structure.

## Phase Overview

| Phase | Focus (from ORCHESTRATOR.md) | Primary Crates / Components | KG Sections That Own the Knowledge |
|-------|------------------------------|-----------------------------|------------------------------------|
| P0 | Harness registration, OpenSrc tracking, docs-only verify | .harness/*, scripts/harness-verify.sh | This entire knowledgeGraph/ dir + project-context.md |
| P1 | Rust workspace skeleton + core types (NormalizedEvent, etc.) | core-types, config | 02-data-flows (NormalizedEvent definition) + 06 (this file) |
| P2 | Postgres + migrations + batched storage writer | storage, migrations, infra/docker-compose | 02 (storage flow) + 03 (constraints on durability) |
| P3 | v2 DEX adapters + registry + state reader | dex, registry, state-reader | 02 + 04 (Uniswap/Sushi references) |
| P4 | Ethereum MEV-Share + L2 block-delta collectors + decoder | collectors, mevshare, chain-watchers, decoder | 02 (collector flows) + 04 (MEV-Share repos) |
| P5 | strategy-api + backrun-v1 | strategy-api, strategies/backrun-v1 | 02 + 05 (innovation from simple-blind-arbitrage) |
| P6 | PnL + flashloan fee model | pnl | 02 + 05 (flashloan example repos) |
| P7 | Deterministic Risk Engine | risk | 03-constraints-and-gates (the authoritative section) |
| P8 | Fast-estimate simulator + ml_features writer | simulator, ml | 02 + 05 (ML crates for future) |
| P9 | Metrics, health, Telegram alerts | metrics | 02 (observability flow) |
| P10 | Daily reports + VPS + systemd packaging | reporter + docs/16-vps-deployment.md | 02 + success criteria in 03 |
| P11 | Evidence review + live-execution gate decision | All + Orchestrator | 05 + 07-validation-report + this file |

## Crate Layout (from 20-agentic-coding-prompt.md) – V1 Only

```
rust-searcher-lab/
├── apps/searcher-worker
├── crates/
│   ├── core-types
│   ├── config
│   ├── storage
│   ├── collectors
│   ├── mevshare
│   ├── chain-watchers
│   ├── decoder
│   ├── registry
│   ├── state-reader
│   ├── dex
│   ├── strategy-api
│   ├── strategies/backrun-v1
│   ├── simulator          # FastEstimateSim only in V1
│   ├── pnl
│   ├── risk
│   ├── cache              # In-memory only (dashmap/lru)
│   ├── metrics
│   └── ml                 # Feature rows only – no model
└── infra/
    └── docker-compose.yml  # Postgres only
```

**Explicitly forbidden in V1 crate layout** (per the prompt):
- apps/replay-cli, apps/admin-api
- crates/execution
- contracts/
- strategies/{cyclic-arb, lending-arb, blind-backrun}
- Any Redis implementation
- Any ML model/training/serving code

## How the Knowledge Graph Supports Each Phase

- **P0–P1**: The KG itself (this directory) + `project-context.md` + `AGENTS.md` + `ORCHESTRATOR.md` are the primary artifacts.
- **P2–P4**: Heavy use of `02-data-flows-and-normalization.md` and `04-opensrc-provenance.md`.
- **P5–P7**: `03-constraints-and-gates.md` (especially the Risk Engine section) is mandatory reading before writing any code.
- **P8–P11**: `05-innovation-opportunities.md` becomes the source of truth for what can be built after the various gates.

## Gate Enforcement in the KG

Every phase transition in the real project must be able to point to evidence in the KG that the previous gate was passed (or explicitly accepted as a pivot).

This mapping ensures that when an agent (or human) asks "What should I work on next?", the answer is always traceable back to both the official plan and the accumulated deep understanding in this directory.
