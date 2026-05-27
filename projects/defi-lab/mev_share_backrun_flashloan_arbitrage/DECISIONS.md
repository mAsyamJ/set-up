# DECISIONS.md — MEV Share Backrun Flashloan Arbitrage

Architectural gates derived from the doc pack (`00-executive-decision.md`, `01-product-scope.md`, `17-14-30-60-90-day-plan.md`, `20-agentic-coding-prompt.md`, and supporting technical docs). Amend here when intentionally changing course. All decisions carry the three-tier tagging discipline.

| ID | Decision | Rationale | Status |
|----|----------|-----------|--------|
| D1 | Product V1 = multi-chain **shadow** scanner only (no live execution) | Validates whether any edge survives honest net-of-bribe costs before risking capital or building contracts | Active |
| D2 | Broad scanner / narrow executor | Multi-chain evidence collection is the highest-ROI first step; live is promoted later to exactly one chain + one strategy after evidence | Active |
| D3 | One Rust worker binary, not microservices | Simpler ops on a cheap VPS; async tasks + bounded channels + backpressure until profiling proves a split is required | Active |
| D4 | Postgres (via sqlx) as source of truth; no Redis in V1 | Durable, queryable evidence store for reports and ML features; caches are in-memory and rebuildable | Active |
| D5 | Alloy over ethers-rs | Modern, actively maintained Rust EVM stack; alignment with Flashbots/Paradigm MEV tooling | Active |
| D6 | MEV-Share SSE only for Ethereum; Base/Arbitrum use public block-delta collectors | MEV-Share is Ethereum-specific private orderflow; L2s observed via public state deltas for shadow study | Active |
| D7 | Deterministic risk engine is authoritative (blocks or downgrades) | Safety and honesty; ML (when added later) may only rank/filter, never override risk gates | Active |
| D8 | Flashloans modeled as fee/feasibility only (no executor in V1) | Allows PnL realism for future live path without introducing contracts or capital risk now | Active |
| D9 | ML feature rows collected from day one; no model/training/serving in V1 | Data asset for later offline analysis; avoids premature complexity and "do not build yet" scope | Active |
| D10 | Fast-estimate simulator now; accurate fork/replay (revm/reth or Anvil) is BUILD LATER | Fast estimates enable early signal; accurate replay is required before any live canary decision | Active |
| D11 | v2/Sushi-v2 DEX adapters + registry first; v3/v4/Balancer/Curve later | Long-tail v2 mispricings are the primary hypothesis for V1; wider DEX coverage is deferred until data justifies | Active |

## Kill / pivot triggers (from `00-executive-decision.md`)

- After weeks of multi-chain shadow data: **no chain/strategy shows opportunities that survive 75% bribe capture with a coherent, repeatable pattern** → do **not** build execution. The edge isn't there for this strategy family. Pivot (e.g., OEV/SVR watcher, different chains, different DEX tier) or sunset.
- If the only "profitable" rows collapse under accurate replay (Day 60 gate): the fast-estimate is lying — fix the estimator or stop before any live work. Accurate replay failing is the cheapest place to discover an illusory edge.
- Any safety incident, excessive revert rate, or realized PnL persistently below predicted during a future conditional canary → pull the canary immediately and return to shadow/replay.

These triggers are non-negotiable. Evidence, not schedule, earns the right to live execution.
