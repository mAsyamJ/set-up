# Innovation Opportunities (BUILD NOW / LATER / DO NOT BUILD YET)

This is the living innovation backlog for the project. Every idea is tagged with the official three-tier system and cross-referenced to the V1 hard gates in `03-constraints-and-gates.md`.

## BUILD NOW (V1 Shadow Scanner – Must Ship for Day 14+ Soak)

- Robust MEV-Share SSE collector with reconnect, dedup, historical backfill
- Base + Arbitrum block-delta collectors (public state observation)
- Single canonical `NormalizedEvent` model
- v2 / Sushi-v2 DEX adapters + Postgres + dashmap registry + state reader with freshness
- `strategy-api` trait + concrete `backrun-v1` (long-tail mispricing detection only)
- Honest PnL accountant including flashloan **fee** as a cost (no execution)
- Deterministic, authoritative Risk Engine (token denylist, liquidity, staleness)
- Fast-estimate simulator (closed-form) behind `Simulator` trait
- Batched async Postgres writer that never blocks collectors
- Prometheus + axum /health + /metrics + Telegram alerts
- Daily cross-chain survival report (survives_50/75/90)
- `ml_features` row collection from day one (no model)

These are non-negotiable for the 72h+ VPS soak success criteria.

## BUILD LATER (Evidence-Driven – Only After Gates Pass)

| Idea | Source of Inspiration | Why It Is Powerful | Earliest Gate |
|------|-----------------------|--------------------|---------------|
| Accurate fork/replay simulator (revm/reth or Anvil) behind existing `Simulator` trait | Foundry + paradigmxyz/reth (in OpenSrc list) | Validates the fast-estimate before any live canary | Day 60 replay gate |
| Strategy plugin architecture (multiple families: cyclic arb, lending arb, blind backrun variants, OEV/SVR watcher) | paradigmxyz/artemis (top priority future clone) + flashbots/simple-blind-arbitrage patterns | Turns the searcher into a platform instead of a single-strategy binary | After repeatable survives_75 clusters |
| Redis hot-path cache | Only after measured bottleneck in profiling | Latency reduction for high-frequency pairs | Post Day 30 soak + profiling |
| Offline ML ranking / false-positive filtering (logistic regression / GBT / etc.) on `ml_features` | catboost, river, linfa, smartcore, ort (all cached) | Improves precision without ever overriding the deterministic Risk Engine | After sufficient labeled data from accurate replay |
| Additional DEX adapters (v3, v4, Balancer, Curve) | Uniswap v3-periphery, Balancer, Curve references | Expands the addressable opportunity surface | After v2 backrun proves repeatable edge |
| Historical replay to label `ml_features.label_realized` | MEV-Share historical hints + L2 public data | Creates the training set for future models | Day 30+ |

## DO NOT BUILD YET (Explicitly Forbidden in V1, High Risk of Scope Creep)

- Any live bundle submission (`mev_sendBundle`, signing, private submission)
- Flashloan executor contract or live flashloan callback path (even "tiny canary")
- Redis as a correctness dependency
- ML model training or serving (feature collection is allowed and encouraged)
- Web dashboards, admin APIs, or user-facing UIs
- Microservices or Kubernetes deployment
- Self-hosted archive nodes
- Generic public flashloan arbitrage (focus remains long-tail v2 backrun first)
- Uniswap v4 hook-aware strategies in the core loop
- Deep learning or complex models before simple baselines are beaten

These are documented in `docs/19-do-not-build-yet.md` and `docs/18-ml-and-redis-later.md`.

## High-Signal Patterns Pulled from the Current Research Corpus (May 2026)

1. **Artemis-style modularity** (once cloned)
   - Clean separation of collectors, strategies, and executors
   - Strongly suggests the future path after V1 proves edge

2. **Real flashloan bot guard patterns** (Haehnchen, kaymen99, yuyasugano repos – all cached)
   - `check()` simulation before `start()`
   - Multiple independent profit + block + allowance guards
   - Lender-specific callback validation
   - These will directly inform the post-Day-90 executor design

3. **Blind on-chain calculation** (flashbots/simple-blind-arbitrage)
   - The entire strategy can sometimes be computed from pool state alone
   - This is the spiritual ancestor of `backrun-v1`

4. **MEV-Share hint partial-info handling**
   - Different completeness levels require different strategies (fully visible vs. hash-only)
   - Already influencing the `NormalizedEvent` design and backrun-v1 confidence scoring

## How to Propose New Opportunities

1. Add a row to the appropriate table above.
2. Tag it with the correct BUILD tier.
3. Reference the specific OpenSrc repo(s) or internal doc that inspired it.
4. Link it to the earliest phase/gate that could justify the work.
5. The Orchestrator must approve moving anything from LATER into active planning.

This file is the bridge between raw research (04) and concrete phase planning (06).
