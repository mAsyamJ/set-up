# 18 — ML & Redis (Deferred)

Both are in the **target** architecture and both are **BUILD LATER**. V1 prepares for them
(collects features, uses an in-memory cache) but builds neither model nor Redis.

## ML — deferred, with a hard gating rule

> **ML can rank and filter. ML must NOT override deterministic risk checks.** (See `14`.)
> No ML in the live-execution path until it has proven, measured value on real labels.

### V1: feature collection only (BUILD NOW)
- Every candidate writes an `ml_features` row: a structured feature vector + (later) a
  realized label.
- **Features** (collected now): pair, chain, DEX, pool liquidity depth, pre/post price
  impact, observed/assumed swap size, gas price, time-of-day, mempool/hint partial-info
  flag, alt-venue spread, route hop count, token risk flags, recent pool volatility.
- **Labels** (filled LATER by replay/post-land): realized net PnL, did-it-survive,
  did-a-real-backrun-land, prediction error.

### LATER: offline analysis → training → serving
1. **Offline analysis** (Day 30+): once enough labeled rows exist, study which features
   predict `survives_75` / low false-positive rate.
2. **Model training** (Day 60+): start with **simple models** —
   - **logistic regression** (false-positive / will-survive classification),
   - **gradient-boosted trees** (opportunity scoring, route profitability),
   - **online bandit ranking** (dynamic strategy/threshold ranking).
   Schedule: **offline, batch-retrained** (e.g. nightly/weekly) — no online learning in
   the hot path initially.
3. **Serving** (LATER): the model produces a *score* that **ranks/filters** candidates
   that already passed risk. It tunes thresholds and prioritizes attention. It never
   promotes a risk-rejected candidate and never sits in the live execution decision until
   it has demonstrably reduced false positives on held-out labeled data.

### Why simple models beat deep learning here
- Tabular features, modest data volume, need for interpretability and fast inference.
- GBTs/logistic regression are interpretable (you can see which feature drove a score),
  cheap to train/serve, and robust on small datasets. Deep learning adds opacity, data
  hunger, and latency for no expected gain. **No deep learning. No LLMs in the hot path.**

### The seven intended ML uses (all LATER, all filtering/ranking)
opportunity scoring · false-positive prediction · strategy performance ranking ·
gas/bribe-survival prediction · token-risk classification (advisory; the deterministic
denylist still rules) · route-profitability clustering · dynamic threshold tuning.

## Redis — deferred until a measured bottleneck

### V1: in-memory cache (BUILD NOW)
- Hot pool snapshots, token metadata/decimals, pool-registry lookups, latest gas, recent
  event dedup — all in-process (`dashmap` / `lru`).
- **Failure behavior:** a cache miss falls back to Postgres/RPC off the hot path; **if hot
  state is stale, the candidate is downgraded** (and a future live path would block) — see
  `14`. The cache is an accelerator, never a source of truth.

### LATER: Redis, only when justified
- Add Redis **only after** profiling shows the in-memory cache is insufficient — e.g.
  multiple worker processes must share hot state, or memory pressure forces eviction of
  hot data. Until then it's another container to run and fail for no benefit.
- TTLs (when added): pool snapshots short (seconds, block-scoped), token metadata long
  (hours/permanent), gas estimates seconds. Invalidation on new block for state-bearing
  keys.

## The discipline

Collect the data now so the LATER work is possible; build neither the model nor Redis
until shadow data, labels, and measured need exist. Premature ML/Redis is exactly the
infrastructure-first trap this whole plan is built to avoid.
