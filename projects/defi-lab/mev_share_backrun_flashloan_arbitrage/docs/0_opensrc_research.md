You should expand the OpenSrc map into **four layers**:

```text
1. MEV-Share / searcher source of truth
2. Flashloan / DEX execution source of truth
3. Low-latency Rust infrastructure source of truth
4. Machine-learning / strategy-intelligence source of truth
```

**Getting Started with `opensrc` (the official CLI for agent research)**

See the dedicated guide: [docs/research/using-opensrc-cli.md](research/using-opensrc-cli.md)

It explains `npm install -g opensrc`, the `$(opensrc path <spec>)` pattern (works with GitHub, crates:, pypi:, etc.), and how it integrates with this project's expanded research corpus and `.harness/opensrc-packages.txt`.

All `rg $(opensrc path ...)` examples in this document assume you have run the cache script and/or have the CLI available.

---

Your uploaded technical doc already defines the correct product shape: a **Rust-based broad shadow searcher**, starting with **Ethereum MEV-Share**, using **multi-chain scanning**, normalizing DEX state, and promoting only the strongest narrow opportunity class to live execution later. 

The most important source repo remains `flashbots/simple-blind-arbitrage`, because it is an official Flashbots example for blindly submitting atomic arbitrage opportunities to the MEV-Share Node, and its README explicitly says it can backrun Uniswap v2 transactions by calculating optimal arbitrage between two pools on-chain even when user trade details are hidden. It also lists future improvements like flashloans, more pools, more v2 forks, non-WETH coins, and other DEXes — exactly the expansion path you want. ([GitHub][1])

---

# Final source strategy

## Build-now source repos

These are the repos your coding agent should inspect before implementing V1:

```bash
opensrc fetch \
  flashbots/simple-blind-arbitrage \
  flashbots/mev-share \
  flashbots/mev-share-client-ts \
  paradigmxyz/mev-share-rs \
  alloy-rs/alloy \
  Uniswap/v2-core \
  Uniswap/v2-periphery \
  sushiswap/v2-core \
  sushiswap/v2-periphery \
  aave/aave-v3-core \
  aave/aave-address-book \
  balancer/balancer-v2-monorepo \
  foundry-rs/foundry \
  crates:tokio \
  crates:reqwest \
  crates:serde \
  crates:sqlx \
  crates:tracing \
  crates:tracing-subscriber \
  crates:metrics \
  crates:metrics-exporter-prometheus \
  crates:dashmap \
  crates:lru \
  crates:eyre \
  crates:color-eyre
```

## Build-later source repos

These are important, but should not become V1 live execution scope:

```bash
opensrc fetch \
  Uniswap/v3-core \
  Uniswap/v3-periphery \
  Uniswap/v4-core \
  Uniswap/v4-periphery \
  sushiswap/v3-core \
  curvefi/curve-router-ng \
  smartcontractkit/chainlink \
  paradigmxyz/reth \
  bluealloy/revm \
  rust-ml/linfa \
  smartcorelib/smartcore \
  catboost/catboost \
  online-ml/river \
  pykeio/ort \
  huggingface/candle \
  tracel-ai/burn \
  dmlc/xgboost
```

---

## Expanded Research Corpus for Agentic Harness Workflow
### (MEV Shared Flashloan Arbitrage Bot — Source Code, Patterns & Innovation)

This superset was explicitly added to support **agentic harness** research workflows:

- Systematic source code study by agents (OpenSrc Librarian, rust-core, rust-evm, etc.)
- Extraction of flashloan, backrun, and arbitrage mechanics from real public implementations
- Innovation input when evolving the searcher beyond pure V1 shadow scanner
- Future gated live execution phases (post Day-60/90 evidence gates)

**Command used to seed this expanded research set:**

```bash
opensrc fetch \
  flashbots/simple-blind-arbitrage \
  flashbots/mev-share \
  flashbots/mev-share-client-ts \
  paradigmxyz/mev-share-rs \
  paradigmxyz/artemis \
  Uniswap/v2-core \
  Uniswap/v2-periphery \
  Uniswap/v3-periphery \
  aave/aave-v3-core \
  aave/aave-address-book \
  balancer/balancer-v2-monorepo \
  Haehnchen/uniswap-arbitrage-flash-swap \
  yuyasugano/pancake-bakery-arbitrage \
  kaymen99/aave-flashloan-arbitrage \
  alloy-rs/alloy \
  foundry-rs/foundry \
  catboost/catboost \
  online-ml/river \
  rust-ml/linfa \
  smartcorelib/smartcore \
  pykeio/ort
```

**Note:** The machine-readable, harness-authoritative list lives at:

`.harness/opensrc-packages.txt`

After using the research corpus, go to the **Knowledge Graph** for the synthesized deep understanding:

→ [`.harness/research/knowledgeGraph/index.md`](.harness/research/knowledgeGraph/index.md)

It includes full provenance (04), innovation opportunities with BUILD tags (05), and validation against all V1 gates.

---

# 1. MEV-Share / searcher repos

| Repo                                         | Priority | Use for                  | Why it matters                                                                                                                                     |
| -------------------------------------------- | -------: | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flashbots/simple-blind-arbitrage`           |   **P0** | Blind backrun reference  | It contains a contract and script that listens to MEV-Share and submits blind arbitrage attempts; it is the closest repo to your V1. ([GitHub][1]) |
| `flashbots/mev-share`                        |   **P0** | Protocol/bundle source   | GitHub describes it as the protocol for orderflow auctions; use it for bundle types and API assumptions. ([GitHub][2])                             |
| `flashbots/mev-share-client-ts`              |       P1 | API behavior reference   | Useful for seeing how the official/near-official TS client structures events and requests.                                                         |
| `paradigmxyz/mev-share-rs`                   |       P1 | Rust reference           | Use as a reference only; your core should be Alloy-first if possible.                                                                              |
| `flashbots/ethers-provider-flashbots-bundle` |       P2 | Legacy TS bundle sending | Reference for bundle submission patterns, not Rust architecture.                                                                                   |

## OpenSrc commands

```bash
rg "percentageToKeep" $(opensrc path flashbots/simple-blind-arbitrage)
rg "Uniswap" $(opensrc path flashbots/simple-blind-arbitrage)
rg "WETH" $(opensrc path flashbots/simple-blind-arbitrage)
rg "bundle" $(opensrc path flashbots/simple-blind-arbitrage)
rg "mev_sendBundle" $(opensrc path flashbots/mev-share)
rg "privacy" $(opensrc path flashbots/mev-share)
rg "inclusion" $(opensrc path flashbots/mev-share)
rg "canRevert" $(opensrc path flashbots/mev-share)
```

## What to integrate

```text
- Listener + executor split
- Blind v2 backrun model
- On-chain optimal sizing for partial-hint situations
- Profit-share / bribe modeling
- Bundle body shape
- Historical/replay workflow
```

## What to improve

`simple-blind-arbitrage` itself says it could be improved by loading all pairs upfront, using flashloans, checking more v2 forks, using non-WETH coins, integrating other DEXes, and custom hints. Those are your innovation lanes, not day-one live scope. ([GitHub][1])

---

# 2. Flashloan / lending repos

| Repo                            | Priority | Use for                                                                | Why it matters                                                                                                                          |
| ------------------------------- | -------: | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `aave/aave-v3-core`             |   **P0** | `flashLoanSimple`, `flashLoan`, premium logic                          | GitHub describes it as the core contracts of Aave V3. Use it for source-level truth before writing any flashloan adapter. ([GitHub][3]) |
| `aave/aave-address-book`        |       P0 | market addresses                                                       | Use for chain configs and pool addresses.                                                                                               |
| `balancer/balancer-v2-monorepo` |   **P0** | Vault flashloan, `receiveFlashLoan`, `getPoolTokens`, `queryBatchSwap` | GitHub identifies it as the Balancer V2 monorepo; use it for Vault/lender integration and Balancer quoting. ([GitHub][4])               |
| `Uniswap/v4-core`               |       P2 | flash accounting research                                              | Not an external flashloan lender; useful later for internal v4 route settlement.                                                        |
| `Uniswap/v4-periphery`          |       P2 | v4 integrations                                                        | Later only.                                                                                                                             |

## OpenSrc commands

```bash
rg "flashLoanSimple" $(opensrc path aave/aave-v3-core)
rg "flashLoan" $(opensrc path aave/aave-v3-core)
rg "FLASHLOAN_PREMIUM_TOTAL" $(opensrc path aave/aave-v3-core)
rg "executeOperation" $(opensrc path aave/aave-v3-core)

rg "flashLoan" $(opensrc path balancer/balancer-v2-monorepo)
rg "IFlashLoanRecipient" $(opensrc path balancer/balancer-v2-monorepo)
rg "receiveFlashLoan" $(opensrc path balancer/balancer-v2-monorepo)
rg "getPoolTokens" $(opensrc path balancer/balancer-v2-monorepo)
rg "queryBatchSwap" $(opensrc path balancer/balancer-v2-monorepo)

rg "unlock" $(opensrc path Uniswap/v4-core)
rg "unlockCallback" $(opensrc path Uniswap/v4-core)
rg "delta" $(opensrc path Uniswap/v4-core)
rg "flash" $(opensrc path Uniswap/v4-core)
```

## Flashloan integration decision

Use this order:

```text
V1:
- Model Balancer/Aave availability and fees only.
- No live executor.

V2:
- Fork-test Balancer flashloan adapter.
- Fork-test Aave flashLoanSimple adapter.

V3:
- Add live canary only after shadow replay proves repeatable net-positive candidates.

V4:
- Treat Uniswap v4 flash accounting as route-settlement optimization, not as external borrowed capital.
```

---

# 3. DEX / AMM repos

## V2-style AMMs — build now

| Repo                     | Priority | Use for                                              |
| ------------------------ | -------: | ---------------------------------------------------- |
| `Uniswap/v2-core`        |   **P0** | pair reserves, `Swap`, `Sync`, factory pair creation |
| `Uniswap/v2-periphery`   |   **P0** | router math, `getAmountOut`, path functions          |
| `sushiswap/v2-core`      |   **P0** | v2-fork compatibility                                |
| `sushiswap/v2-periphery` |       P1 | router compatibility                                 |

V2 is first because your source doc and Flashbots example both point to **v2-style blind backrun** as the simplest executable path under partial MEV-Share hints. 

```bash
rg "getReserves" $(opensrc path Uniswap/v2-core)
rg "event Swap" $(opensrc path Uniswap/v2-core)
rg "event Sync" $(opensrc path Uniswap/v2-core)
rg "PairCreated" $(opensrc path Uniswap/v2-core)
rg "getAmountOut" $(opensrc path Uniswap/v2-periphery)
rg "swapExactTokensForTokens" $(opensrc path Uniswap/v2-periphery)

rg "getReserves" $(opensrc path sushiswap/v2-core)
rg "PairCreated" $(opensrc path sushiswap/v2-core)
```

## V3/V4/Curve/Balancer — shadow later

| Repo                            | Priority | Use for                                            |
| ------------------------------- | -------: | -------------------------------------------------- |
| `Uniswap/v3-core`               |       P1 | `slot0`, liquidity, tick, swap event               |
| `Uniswap/v3-periphery`          |       P1 | Quoter/router/path encoding                        |
| `Uniswap/v4-core`               |       P2 | PoolManager, hooks, dynamic fees, flash accounting |
| `Uniswap/v4-periphery`          |       P2 | StateView/Quoter/router research                   |
| `sushiswap/v3-core`             |       P2 | Sushi concentrated liquidity                       |
| `curvefi/curve-router-ng`       |       P2 | Curve quote routing via `get_dy/get_dx`            |
| `balancer/balancer-v2-monorepo` |       P1 | Balancer quotes and pool state                     |

```bash
rg "slot0" $(opensrc path Uniswap/v3-core)
rg "liquidity" $(opensrc path Uniswap/v3-core)
rg "event Swap" $(opensrc path Uniswap/v3-core)
rg "Quoter" $(opensrc path Uniswap/v3-periphery)

rg "contract PoolManager" $(opensrc path Uniswap/v4-core)
rg "hook" $(opensrc path Uniswap/v4-core)
rg "dynamic" $(opensrc path Uniswap/v4-core)
rg "StateView" $(opensrc path Uniswap/v4-periphery)
rg "Quoter" $(opensrc path Uniswap/v4-periphery)

rg "get_dy" $(opensrc path curvefi/curve-router-ng)
rg "get_dx" $(opensrc path curvefi/curve-router-ng)
```

---

# 4. Low-latency Rust infrastructure repos

| Repo / crate                              | Priority | Use for                                          | Decision                |
| ----------------------------------------- | -------: | ------------------------------------------------ | ----------------------- |
| `alloy-rs/alloy`                          |   **P0** | EVM provider, RPC, subscriptions, contract calls | Core EVM stack          |
| `tokio`                                   |   **P0** | async runtime                                    | Core runtime            |
| `reqwest`                                 |   **P0** | HTTP/SSE                                         | MEV-Share SSE + history |
| `serde`                                   |   **P0** | event serialization                              | Core types              |
| `sqlx`                                    |   **P0** | Postgres                                         | source-of-truth DB      |
| `tracing`                                 |   **P0** | structured logs                                  | VPS ops                 |
| `metrics` + `metrics-exporter-prometheus` |       P0 | metrics endpoint                                 | low-cost observability  |
| `dashmap`                                 |       P1 | concurrent registry/cache                        | hot pool map            |
| `lru`                                     |       P1 | in-memory cache                                  | Redis deferred          |
| `eyre` / `color-eyre`                     |       P1 | errors                                           | debugging               |

Alloy is the correct base for your Rust EVM implementation because your product is a Rust searcher and needs RPC, logs, subscriptions, `eth_call`, and later potentially typed contract bindings. Your previous doc also chose Alloy + Tokio + reqwest/jsonrpsee as the Rust stack. 

```bash
opensrc fetch alloy-rs/alloy

rg "ProviderBuilder" $(opensrc path alloy-rs/alloy)
rg "connect_http" $(opensrc path alloy-rs/alloy)
rg "connect_ws" $(opensrc path alloy-rs/alloy)
rg "get_logs" $(opensrc path alloy-rs/alloy)
rg "subscribe" $(opensrc path alloy-rs/alloy)
rg "Anvil" $(opensrc path alloy-rs/alloy)

rg "migrate" $(opensrc path crates:sqlx)
rg "Json" $(opensrc path crates:tracing-subscriber)
rg "PrometheusBuilder" $(opensrc path crates:metrics-exporter-prometheus)
```

## Low-latency design rule

Do not add Kafka/NATS/Redis/microservices in V1. Use:

```text
Tokio tasks
bounded mpsc channels
in-memory DashMap/LRU
Postgres async writes
Prometheus metrics
one worker binary
```

Add Redis only when profiling proves the in-process cache is the bottleneck.

---

# 5. Simulation / replay / EVM execution repos

| Repo                 | Priority | Use for                             |
| -------------------- | -------: | ----------------------------------- |
| `foundry-rs/foundry` |   **P0** | Forge/Anvil fork tests              |
| `bluealloy/revm`     |       P2 | future local EVM simulation         |
| `paradigmxyz/reth`   |       P2 | future node/replay/indexing backend |

```bash
opensrc fetch foundry-rs/foundry bluealloy/revm paradigmxyz/reth

rg "createSelectFork" $(opensrc path foundry-rs/foundry)
rg "anvil" $(opensrc path foundry-rs/foundry)
rg "fork" $(opensrc path foundry-rs/foundry)

rg "Executor" $(opensrc path bluealloy/revm)
rg "Database" $(opensrc path bluealloy/revm)
rg "Provider" $(opensrc path paradigmxyz/reth)
```

## Decision

```text
V1:
- Use RPC eth_call + post-land replay + Anvil fork tests.

Later:
- Move hot simulation to revm only if RPC/Anvil becomes too slow.
- Move indexing to reth only if provider cost/latency becomes your bottleneck.
```

---

# 6. Machine-learning repos

Do **not** put ML in the hot path in V1. For this bot, ML should first be used for:

```text
- false-positive prediction
- candidate ranking
- gas/bribe survival classification
- route family clustering
- token risk scoring
- strategy/chain performance comparison
- dynamic threshold tuning
```

It should **not** decide live execution alone. Deterministic risk checks must still block live trades.

## Best ML source repos by use case

| Repo                     | Priority | Use for                                | Why                                                                                                                                                                                       |
| ------------------------ | -------: | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catboost/catboost`      |   **P1** | offline ranking/classification         | CatBoost is a high-performance gradient boosting library for ranking, classification, and regression, with fast prediction speed and numerical/categorical feature support. ([GitHub][5]) |
| `online-ml/river`        |   **P1** | streaming/online learning research     | River is an online ML library for dynamic data streams and continual learning; useful conceptually for concept drift in MEV markets. ([arXiv][6])                                         |
| `rust-ml/linfa`          |       P1 | native Rust classical ML               | Linfa aims to provide a comprehensive Rust ML toolkit and includes classical algorithms like logistic regression, trees, clustering, FTRL, preprocessing, and more. ([GitHub][7])         |
| `smartcorelib/smartcore` |       P1 | native Rust ML alternative             | Comprehensive Rust ML/numerical library; useful for simpler native models. ([GitHub][8])                                                                                                  |
| `pykeio/ort`             |       P1 | ONNX inference in Rust                 | Use later if you train models offline and export to ONNX for low-latency Rust inference. ([GitHub][9])                                                                                    |
| `dmlc/xgboost`           |       P2 | offline GBDT comparison                | Scalable gradient boosting framework; useful for offline experiments. ([GitHub][10])                                                                                                      |
| `huggingface/candle`     |       P3 | Rust neural network inference/research | Candle is a minimalist Rust ML framework; not necessary for V1. ([GitHub][11])                                                                                                            |
| `tracel-ai/burn`         |       P3 | Rust deep learning                     | Burn is flexible/efficient/portable, but too heavy for V1 searcher decisions. ([GitHub][12])                                                                                              |

## ML OpenSrc commands

```bash
opensrc fetch \
  catboost/catboost \
  online-ml/river \
  rust-ml/linfa \
  smartcorelib/smartcore \
  pykeio/ort \
  dmlc/xgboost \
  huggingface/candle \
  tracel-ai/burn

rg "predict" $(opensrc path catboost/catboost)
rg "rank" $(opensrc path catboost/catboost)
rg "feature" $(opensrc path catboost/catboost)

rg "LogisticRegression" $(opensrc path rust-ml/linfa)
rg "Ftrl" $(opensrc path rust-ml/linfa)
rg "RandomForest" $(opensrc path rust-ml/linfa)
rg "DecisionTree" $(opensrc path smartcorelib/smartcore)

rg "ONNX" $(opensrc path pykeio/ort)
rg "Session" $(opensrc path pykeio/ort)

rg "drift" $(opensrc path online-ml/river)
rg "partial_fit" $(opensrc path online-ml/river)
```

## ML architecture for your bot

```text
V1:
- collect ML feature rows only
- no model in live path

V2:
- offline notebooks / Python training
- CatBoost or River experiments
- evaluate false-positive and net-PnL prediction

V3:
- export simple model to ONNX or implement simple Rust-native model
- use model only as rank/filter, not safety override

V4:
- online threshold tuner per chain/strategy
```

## ML feature table

Collect these features from day one:

```sql
CREATE TABLE ml_feature_rows (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  chain_id BIGINT NOT NULL,
  source TEXT NOT NULL,
  strategy TEXT NOT NULL,

  event_type TEXT,
  hint_has_logs BOOLEAN,
  hint_has_calldata BOOLEAN,
  hint_has_function_selector BOOLEAN,
  hint_contract_count INT,

  dex_family TEXT,
  pool_address TEXT,
  token0 TEXT,
  token1 TEXT,
  base_token TEXT,

  liquidity_usd NUMERIC,
  reserve0 NUMERIC,
  reserve1 NUMERIC,
  pool_age_seconds BIGINT,
  token0_age_seconds BIGINT,
  token1_age_seconds BIGINT,

  gas_base_fee_gwei NUMERIC,
  priority_fee_gwei NUMERIC,
  estimated_gas_units BIGINT,

  gross_profit_est_usd NUMERIC,
  gas_cost_est_usd NUMERIC,
  bribe_est_usd NUMERIC,
  flashloan_fee_est_usd NUMERIC,
  slippage_est_usd NUMERIC,
  net_profit_est_usd NUMERIC,

  risk_score NUMERIC,
  token_risk_flags JSONB,

  sim_success BOOLEAN,
  replay_success BOOLEAN,
  realized_net_usd NUMERIC,
  landed BOOLEAN,
  reverted BOOLEAN,

  label_profitable BOOLEAN,
  label_false_positive BOOLEAN
);
```

## First useful ML tasks

| Model                     | Target label                      | Best first tool                | Hot path? |
| ------------------------- | --------------------------------- | ------------------------------ | --------- |
| False positive classifier | candidate died in replay          | CatBoost / Linfa logistic      | No        |
| Profitability ranker      | positive replay net PnL           | CatBoost                       | No        |
| Token risk classifier     | toxic token / revert / FoT        | CatBoost + deterministic rules | No        |
| Gas survival model        | survives gas/bribe stress         | Linfa logistic / CatBoost      | No        |
| Strategy bandit           | which chain/strategy to scan more | simple Thompson/UCB            | Later     |
| Drift monitor             | strategy degradation              | River concepts                 | Later     |

---

# 7. Expanded final fetch script

This is the expanded version of your script.

```bash
#!/usr/bin/env bash
set -euo pipefail

# OpenSrc expanded source map for:
# Rust Multi-Chain Backrun / Mispricing Shadow Searcher
#
# Goal:
# - MEV-Share
# - flashloan arbitrage
# - v2/v3/v4 DEX adapters
# - low-latency Rust infra
# - simulation/replay
# - ML/ranking/research
#
# Rule:
# Do not implement protocol-critical code from memory.
# Inspect source repos first.

opensrc fetch \
  \
  flashbots/simple-blind-arbitrage \
  flashbots/mev-share \
  flashbots/mev-share-client-ts \
  paradigmxyz/mev-share-rs \
  flashbots/ethers-provider-flashbots-bundle \
  \
  alloy-rs/alloy \
  \
  Uniswap/v2-core \
  Uniswap/v2-periphery \
  Uniswap/v3-core \
  Uniswap/v3-periphery \
  Uniswap/v4-core \
  Uniswap/v4-periphery \
  \
  sushiswap/v2-core \
  sushiswap/v2-periphery \
  sushiswap/v3-core \
  \
  aave/aave-v3-core \
  aave/aave-address-book \
  balancer/balancer-v2-monorepo \
  curvefi/curve-router-ng \
  smartcontractkit/chainlink \
  \
  foundry-rs/foundry \
  bluealloy/revm \
  paradigmxyz/reth \
  \
  catboost/catboost \
  online-ml/river \
  rust-ml/linfa \
  smartcorelib/smartcore \
  pykeio/ort \
  dmlc/xgboost \
  huggingface/candle \
  tracel-ai/burn \
  \
  crates:tokio \
  crates:serde \
  crates:serde_json \
  crates:reqwest \
  crates:eventsource-client \
  crates:sqlx \
  crates:tracing \
  crates:tracing-subscriber \
  crates:metrics \
  crates:metrics-exporter-prometheus \
  crates:dashmap \
  crates:lru \
  crates:eyre \
  crates:color-eyre \
  crates:anyhow \
  crates:clap \
  crates:config \
  crates:dotenvy \
  crates:chrono \
  crates:uuid \
  crates:rust_decimal \
  crates:ordered-float \
  crates:parking_lot \
  crates:crossbeam \
  crates:rayon
```

---

# 8. `opensrc-audit.sh`

Add a second script that checks whether the important patterns are searchable.

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "== MEV-Share =="
rg "mev_sendBundle|privacy|inclusion|canRevert" $(opensrc path flashbots/mev-share) || true
rg "percentageToKeep|Uniswap|WETH|bundle" $(opensrc path flashbots/simple-blind-arbitrage) || true

echo "== V2 DEX =="
rg "getReserves|PairCreated|event Swap|event Sync" $(opensrc path Uniswap/v2-core) || true
rg "getAmountOut|swapExactTokensForTokens" $(opensrc path Uniswap/v2-periphery) || true

echo "== Flashloan =="
rg "flashLoanSimple|flashLoan|FLASHLOAN_PREMIUM_TOTAL|executeOperation" $(opensrc path aave/aave-v3-core) || true
rg "flashLoan|receiveFlashLoan|IFlashLoanRecipient|getPoolTokens|queryBatchSwap" $(opensrc path balancer/balancer-v2-monorepo) || true

echo "== Alloy =="
rg "ProviderBuilder|connect_http|connect_ws|get_logs|subscribe" $(opensrc path alloy-rs/alloy) || true

echo "== ML =="
rg "predict|feature|rank" $(opensrc path catboost/catboost) || true
rg "LogisticRegression|Ftrl|RandomForest" $(opensrc path rust-ml/linfa) || true
rg "DecisionTree|RandomForest|Gradient" $(opensrc path smartcorelib/smartcore) || true
rg "Session|ONNX" $(opensrc path pykeio/ort) || true

echo "OpenSrc audit complete."
```

---

# 9. Strategy innovation map

## Strategy 1 — Blind v2 backrun with flashloan feasibility

Source base:

```text
flashbots/simple-blind-arbitrage
Uniswap/v2-core
Balancer Vault
Aave v3
```

Innovation:

```text
- keep Flashbots blind-v2 idea
- replace JS listener with Rust
- replace upfront WETH requirement with flashloan modeling
- add Postgres opportunity dataset
- add multi-chain shadow scanner
- add token risk profile
```

V1 status:

```text
BUILD NOW as shadow.
Model flashloan.
Do not execute flashloan yet.
```

---

## Strategy 2 — Cross-DEX v2 fork expansion

Source base:

```text
Uniswap/v2-core
Sushi v2
Pancake v2 later
Aerodrome-style separate later
```

Innovation:

```text
- load all v2/fork pools upfront
- maintain pair -> venues map
- classify WETH/base-token long-tail pools
- shadow compare alternative venues
```

V1 status:

```text
BUILD NOW for Uniswap v2 + Sushi v2.
Add other forks later.
```

---

## Strategy 3 — Flashloan route selector

Source base:

```text
Aave v3 core
Aave address book
Balancer v2 monorepo
```

Innovation:

```text
- choose lender by chain/asset/amount/fee/gas
- compare no-loan vs Balancer vs Aave
- store modeled lender choice in every candidate
```

V1 status:

```text
BUILD NOW as model.
BUILD LATER as contract.
```

---

## Strategy 4 — V3/V4/Balancer/Curve quote shadow

Source base:

```text
Uniswap v3/v4
Balancer
Curve RouterNG
```

Innovation:

```text
- normalize non-v2 quote families into same CandidateOpportunity schema
- calculate prediction error by DEX family
- only promote DEX family when replay error is low
```

V1 status:

```text
BUILD LATER.
```

---

## Strategy 5 — ML strategy ranker

Source base:

```text
CatBoost
River
Linfa
SmartCore
ONNX/ort
```

Innovation:

```text
- use ML to rank candidates, not to override risk
- collect labels from replay/live outcomes
- learn which chain/DEX/token family is worth compute
```

V1 status:

```text
Collect features now.
Train later.
Do not put ML in live path yet.
```

---

# 10. Final ranking of source quality

| Rank | Source                             | Why                                                                   |
| ---: | ---------------------------------- | --------------------------------------------------------------------- |
|    1 | `flashbots/simple-blind-arbitrage` | Direct strategy reference for your first MEV-Share blind-arb product. |
|    2 | `flashbots/mev-share`              | Protocol-level source for MEV-Share/bundles.                          |
|    3 | `Uniswap/v2-core`                  | V1 pool math and event truth.                                         |
|    4 | `alloy-rs/alloy`                   | Rust EVM foundation.                                                  |
|    5 | `aave/aave-v3-core`                | Aave flashloan truth.                                                 |
|    6 | `balancer/balancer-v2-monorepo`    | Balancer flashloan / Vault truth.                                     |
|    7 | `foundry-rs/foundry`               | Fork testing and contract validation.                                 |
|    8 | `catboost/catboost`                | Best practical offline ranking model source.                          |
|    9 | `online-ml/river`                  | Best online/streaming ML research source.                             |
|   10 | `rust-ml/linfa` / `smartcore`      | Native Rust ML for simpler models.                                    |
|   11 | `pykeio/ort`                       | Rust ONNX inference later.                                            |
|   12 | `Uniswap/v4-core`                  | Innovation research, but not V1 live.                                 |

---

# Final strict decision

Your expanded source map should support this actual build order:

```text
1. Rust MEV-Share event collector
2. V2 pool registry
3. Blind backrun candidate detector
4. PnL accountant
5. Flashloan feasibility model
6. Postgres feature logging
7. Replay/simulation validation
8. Offline ML analysis
9. Fork-tested flashloan executor
10. Tiny live canary
```

Do not build this order:

```text
1. ML model
2. Redis
3. v4 hooks
4. live flashloan contract
5. multi-chain live bot
```

Your edge is not “flashloan.” Your edge is:

```text
source-grounded MEV-Share + flashloan-aware shadow research engine
+ accurate replay labels
+ disciplined live promotion
+ ML ranking after data exists
```

[1]: https://github.com/flashbots/simple-blind-arbitrage "GitHub - flashbots/simple-blind-arbitrage · GitHub"
[2]: https://github.com/flashbots/mev-share "GitHub - flashbots/mev-share: Protocol for orderflow auctions · GitHub"
[3]: https://github.com/aave/aave-v3-core "GitHub - aave/aave-v3-core: This repository contains the core smart contracts of the Aave V3 protocol. · GitHub"
[4]: https://github.com/balancer/balancer-v2-monorepo "GitHub - balancer/balancer-v2-monorepo: Balancer V2 Monorepo · GitHub"
[5]: https://github.com/catboost/catboost "GitHub - catboost/catboost: A fast, scalable, high performance Gradient Boosting on Decision Trees library, used for ranking, classification, regression and other machine learning tasks for Python, R, Java, C++. Supports computation on CPU and GPU. · GitHub"
[6]: https://arxiv.org/abs/2012.04740?utm_source=chatgpt.com "River: machine learning for streaming data in Python"
[7]: https://github.com/rust-ml/linfa "GitHub - rust-ml/linfa: A Rust machine learning framework. · GitHub"
[8]: https://github.com/smartcorelib/smartcore "GitHub - smartcorelib/smartcore: A comprehensive library for machine learning and numerical computing. Apply Machine Learning with Rust leveraging first principles. · GitHub"
[9]: https://github.com/pykeio/ort "GitHub - pykeio/ort: Fast ML inference & training for ONNX models in Rust · GitHub"
[10]: https://github.com/dmlc/xgboost "GitHub - dmlc/xgboost: Scalable, Portable and Distributed Gradient Boosting (GBDT, GBRT or GBM) Library,  for Python, R, Java, Scala, C++ and more. Runs on single machine, Hadoop, Spark, Dask, Flink and DataFlow · GitHub"
[11]: https://github.com/huggingface/candle "GitHub - huggingface/candle: Minimalist ML framework for Rust · GitHub"
[12]: https://github.com/tracel-ai/burn "GitHub - tracel-ai/burn: Burn is a next generation tensor library and Deep Learning Framework that doesn't compromise on flexibility, efficiency and portability. · GitHub"
