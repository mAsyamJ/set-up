# 19 — Do Not Build Yet

Hard guardrails. Each forbidden item has the explicit condition that unlocks it. Reaching
for any of these during V1 means you're off-plan.

| Forbidden in V1 | Why | Unlocks when |
|-----------------|-----|--------------|
| **Redis** | One worker process; in-memory cache is enough. Another container to run/fail for no benefit. | A *measured* hot-path bottleneck (Day 60+), or multiple processes must share hot state. |
| **ML model service** (training/serving) | No labels yet; premature. ML must never gate risk. | Labeled `ml_features` exist + offline analysis shows predictive value (Day 30→60+). |
| **Web dashboard** | Grafana (LATER) over Prometheus suffices; front-end is maintenance cost. | A real audience needs it post-validation. Not in 90 days unless justified. |
| **Microservices** | Splitting adds ops + latency for zero benefit at this scale. | Profiling proves a single binary can't keep up — unlikely pre-live. |
| **Live bundle sender** | Submitting bundles = real risk, real funds, real competition. | Day 60 niche clears accurate-replay go/no-go (Day 90 canary, gated). |
| **Flashloan executor contract** | Live contract + funds risk; the edge question needs no borrowing. | Same as live bundle sender — Day 90 canary only, line-by-line audited, Balancer-first, strict guards. |
| **Multi-chain LIVE execution** | Multiplies risk/cost; the whole point is *narrow* executor. | Never as an early step. One chain + one strategy live first; multi-chain live is far future. |
| **Uniswap v4 live strategy** | Immature off-chain quoting; hook MEV-internalization risk. | A v4 adapter + hook classifier exist and v4 shadow data justifies it. |
| **Generic public flashloan arb** | No edge = you're the runner-up eating gas; weakest solo bet. | Never as framed. Edge must come from a *specific* niche, not "generic arb." |
| **Stablecoin-only / blue-chip ETH-USDC first** | Thinnest margins / owned by integrated SBs. | Not first. Only if long-tail data surprisingly points there. |
| **CEX integration** | A market-maker/treasury game; not this product. | Out of scope for the foreseeable roadmap. |
| **Cross-chain arbitrage** | Inventory/bridge risk, non-atomic, capital-heavy. | Out of scope; flashloans don't help across chains. |
| **Deep learning / LLMs in hot path** | Opaque, data-hungry, slow; simple models win here. | Not planned. Simple tabular models only, and only LATER. |
| **Kubernetes** | Massive over-provisioning for one VPS. | Not in this product's lifetime as scoped. |
| **Self-hosted archive node** | A small VPS can't host it; not needed for read/quote. | Only if measured RPC latency demonstrably costs live opportunities (post-live). |
| **Accurate fork/replay sim** | Fast-estimate answers the V1 edge question cheaply. | Day 31+ (BUILD LATER), before any live work. |
| **Additional collectors (BNB/Polygon/Optimism)** | Three chains is enough to find where edge lives. | After Ethereum+Base+Arbitrum shadow data justifies widening. |
| **v3/v4/Balancer/Curve adapters** | v2-style is the simplest correct first signal. | When v2 shadow data shows missed orderflow worth the complexity. |

## The one-sentence test

Before adding anything, ask: *"Does this help answer 'where does a long-tail v2 backrun
survive 75% bribe across chains, in shadow?'"* If not, it's forbidden until a later phase.

## Flashloan, specifically

Modeled as a **fee/feasibility term** in V1 (`11`). It is **not** executed, and there is
**no contract**. The executor is a Day-90-gated, audited, Balancer-first component — and
only if a niche cleared accurate replay. Do not let "Balancer flashloans are free" pull
execution into the shadow scanner; the scanner never executes anything.
