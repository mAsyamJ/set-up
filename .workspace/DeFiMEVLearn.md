You need two parallel learning tracks:

```text
Track A — understand MEV-Share / flashloan arbitrage deeply.
Track B — build the project piece by piece until you can measure edge.
```

For the **$1M ARR goal**, be strict: do not interpret ARR as “I will immediately make $83k/month from arbitrage.” For a solo searcher, that is extremely hard. A more realistic path to $1M ARR is:

```text
Phase 1: build internal PnL engine
Phase 2: prove repeatable private edge
Phase 3: turn it into either:
  - profitable proprietary searcher system, or
  - searcher infrastructure/product for teams, wallets, protocols, or funds
```

Your project should start as **MEV-Share + flashloan-aware backrun engine**, but the $1M ARR path probably comes from **infrastructure, analytics, simulation, monitoring, risk scoring, or strategy tooling**, not only your own live arbitrage.

---

# 0. Core mental model

Your strategy is:

```text
MEV-Share hint
→ infer possible user trade / pool impact
→ simulate backrun
→ borrow capital if needed with flashloan
→ execute all steps atomically
→ repay
→ keep net profit
```

The actual project V1 is safer:

```text
MEV-Share hint
→ infer possible opportunity
→ simulate / replay
→ calculate honest PnL
→ log data
→ no live execution yet
```

Flashbots’ MEV-Share docs say the node shares selective transaction “hints” with searchers, and when a searcher wants to include a private transaction in a bundle, it uses that transaction hash; the node replaces it with the original transaction before forwarding to builders. The same docs also say MEV-Share differs from the normal mempool because only selected transaction parts are shared, which forces probabilistic, on-chain, or fully revealed search strategies. ([Flashbots Docs][1])

---

# 1. Learning map: what you listed, expanded

## 1. Understand MEV-Share

Learn these concepts:

| Topic               | What you must understand                                                               | Source / GitHub                                                 |
| ------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| MEV-Share Node      | Receives private txs/bundles, shares hints, forwards bundles to builders               | Flashbots Getting Started docs ([Flashbots Docs][1])            |
| Event Stream        | SSE stream, pending events, optional fields, Ethereum txs                              | Flashbots Event Stream docs ([Flashbots Docs][2])               |
| Hints               | `hash`, `logs`, `txs`, `callData`, `functionSelector`, etc.; each field can be missing | Flashbots Event Stream docs ([Flashbots Docs][2])               |
| Historical hints    | Backfill training data for replay and ML labels                                        | Flashbots Event Stream historical section ([Flashbots Docs][2]) |
| Bundle construction | Your bundle can include user tx hash + your backrun tx                                 | Flashbots Bundle docs ([Flashbots Docs][3])                     |
| Blind arbitrage     | Backrun without full calldata using on-chain / inferred pool logic                     | Flashbots simple-blind-arbitrage repo ([GitHub][4])             |

Practice task:

```text
Build a Rust MEV-Share SSE listener that:
1. connects to the stream,
2. parses every event,
3. stores raw JSON in Postgres,
4. counts which events include logs/callData/functionSelector,
5. outputs daily stats.
```

OpenSrc source:

```bash
opensrc fetch flashbots/mev-share flashbots/mev-share-client-ts paradigmxyz/mev-share-rs flashbots/simple-blind-arbitrage
```

Search commands:

```bash
rg "mev_sendBundle" $(opensrc path flashbots/mev-share)
rg "privacy" $(opensrc path flashbots/mev-share)
rg "inclusion" $(opensrc path flashbots/mev-share)
rg "functionSelector" $(opensrc path flashbots/mev-share-client-ts)
rg "Event" $(opensrc path paradigmxyz/mev-share-rs)
```

---

## 2. MEV-Share arbitrage vs normal arbitrage

Normal arbitrage:

```text
Pool A price ≠ Pool B price
→ everyone can see it
→ everyone races
```

MEV-Share backrun arbitrage:

```text
Private/pending tx may move Pool A
→ you receive partial hint
→ you infer Pool A will become mispriced
→ you bundle:
    [private tx hash] → [your backrun tx]
```

Flashbots’ simple-blind-arbitrage README says user trade details are hidden by default, but the script can atomically backrun Uniswap v2 transactions from the MEV-Share Node by calculating optimal arbitrage between two Uniswap v2 pools entirely on-chain, with no trade details needed beyond the pool being traded on. ([GitHub][4])

Practice task:

```text
Take 100 historical MEV-Share hints.
Classify each as:
- fully visible
- logs only
- selector only
- hash only
- DEX relevant
- non-DEX relevant
```

Then compute:

```text
How often can I make a real deterministic arbitrage decision?
How often do I need blind/probabilistic logic?
```

---

## 3. Understand “backstop” / backrun safety

I think you mean **backstop** as: “the execution must be protected so if profit is not real, the tx reverts.”

This is non-negotiable.

You must learn these guards:

| Guard                       | Meaning                                                   |
| --------------------------- | --------------------------------------------------------- |
| `minProfit`                 | revert if final token balance increase is below threshold |
| `maxBlockNumber`            | transaction only valid for a short block window           |
| `maxGasPrice` / max fee     | avoid executing under insane gas                          |
| lender callback validation  | only Aave/Balancer/Uniswap pool can call callback         |
| token allowlist             | avoid honeypot/fee-on-transfer tokens                     |
| route allowlist             | avoid arbitrary external calls                            |
| no leftover debt            | ensure flashloan fully repaid                             |
| pause switch                | stop all execution immediately                            |
| dry-run / fork sim required | never live execute untested route                         |

The Haehnchen flash-swap repo is useful here because it exposes the pattern of a read-only `check()` and a live `start()` with a max block guard; its README also says speed matters and arbitrage is “first win.” ([GitHub][5])

Practice task:

```text
Write a Solidity executor skeleton with:
- onlyOwner
- approved pool callback only
- minProfit
- maxBlockNumber
- token allowlist
- route allowlist
- pause
- final balance check
```

Do not connect it live yet.

---

## 4. Learn different pools to flashloan from

## Flashloan source comparison

| Source                          | Mechanism                                                      | Key point                                                                                             | Learn first?                   |
| ------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Balancer Vault**              | `vault.flashLoan()` then `receiveFlashLoan()`                  | Vault consolidates pool balances and docs say current fee is 0; excellent first external lender model | **Yes**                        |
| **Aave V3**                     | `flashLoanSimple()` or `flashLoan()` then `executeOperation()` | Broader lending markets, but fee/premium and chain deployments must be read correctly                 | **Yes**                        |
| **Uniswap V2 flash swap**       | borrow from a pair during `swap`, repay in callback            | Great for v2 pair-specific capital, but repayment math differs from Aave/Balancer                     | Yes, after Balancer/Aave model |
| **Uniswap V3 flash**            | `flash()` then `uniswapV3FlashCallback()`                      | Good for pair flash + fee-tier arbitrage                                                              | Later                          |
| **Uniswap V4 flash accounting** | PoolManager `unlock`/delta settlement                          | Not exactly an external flashloan lender; route-settlement primitive                                  | Later                          |

Balancer’s docs say the Vault holds all pool tokens in one contract, consolidated balances are available for flash loans, and current flash-loan fees are 0; the example also shows `makeFlashLoan()` calling `vault.flashLoan()` and the receiver validating `msg.sender == vault`. ([Balancer][6])

Uniswap V2 flash swaps allow withdrawing tokens with no upfront cost as long as the tokens are paid for or returned by the end of the transaction, and the docs explicitly mention capital-free arbitrage as a use case. ([Uniswap Developers][7])

Practice tasks:

```text
Week exercise:
1. Implement BalancerFlashLoanReceiver on a fork.
2. Implement AaveFlashLoanSimpleReceiver on a fork.
3. Implement UniswapV2FlashSwap callback on a fork.
4. For each, log:
   - borrowed amount
   - fee
   - extra gas
   - callback caller validation
   - final balance delta
```

Source repos:

```bash
opensrc fetch \
  balancer/balancer-v2-monorepo \
  aave/aave-v3-core \
  aave/aave-address-book \
  Uniswap/v2-periphery \
  Uniswap/v3-periphery
```

Audit commands:

```bash
rg "receiveFlashLoan" $(opensrc path balancer/balancer-v2-monorepo)
rg "IFlashLoanRecipient" $(opensrc path balancer/balancer-v2-monorepo)
rg "flashLoanSimple" $(opensrc path aave/aave-v3-core)
rg "executeOperation" $(opensrc path aave/aave-v3-core)
rg "ExampleFlashSwap" $(opensrc path Uniswap/v2-periphery)
rg "uniswapV2Call" $(opensrc path Uniswap/v2-periphery)
rg "PairFlash" $(opensrc path Uniswap/v3-periphery)
rg "uniswapV3FlashCallback" $(opensrc path Uniswap/v3-periphery)
```

---

## 5. Learn different MEV flashloan arbitrage strategies

## Strategy map

| Strategy                      | How it works                                         | Difficulty |                  Competition | First build?             |
| ----------------------------- | ---------------------------------------------------- | ---------: | ---------------------------: | ------------------------ |
| Simple v2 cross-DEX backrun   | User moves UniV2 pool, you arb against Sushi/V2 fork |     Medium |                         High | **Yes, shadow**          |
| Blind v2 MEV-Share backrun    | Infer pool from hints, sizing happens on-chain       |       High |                  Medium-high | **Yes, core wedge**      |
| Multi-hop cyclic arb          | A → B → C → A across pools                           |       High |                       Medium | Later                    |
| Flashloan-backed route arb    | Borrow from Balancer/Aave, execute route, repay      |       High |                       Medium | Model now, execute later |
| Lending/liquidation backrun   | Use flashloan to repay debt/liquidate collateral     |       High |                  Medium-high | Later / OEV path         |
| V3 concentrated-liquidity arb | Tick/liquidity-aware route                           |       High |                         High | Later                    |
| V4 hook-aware arb             | Hooks/dynamic fees/custom accounting                 |  Very high | Lower now, more unknown risk | Later                    |
| Statistical/blind backrunning | Guess missing MEV-Share details                      |  Very high |              Lower but risky | Later                    |

For why MEV search is diverse and not only “simple arb,” read the MEV bundle analysis literature: one study developed tools for identifying DeFi actions in Flashbots bundles and reported 17 new kinds of DeFi MEV activities occurring in 53.12% of bundles. That supports your need to build a **strategy-learning engine**, not only a hardcoded arbitrage bot. ([arXiv][8])

Practice task:

```text
For each strategy, create a StrategySpec:
- required hint fields
- required pool state
- lender required?
- simulation method
- PnL formula
- risk blockers
- live readiness criteria
```

---

## 6. Learn to create high-level transaction / strategy flow in one atomic call

Every profitable flashloan arbitrage strategy must compress into one atomic transaction:

```text
borrow
→ swap / route / liquidate
→ repay
→ assert profit
```

Your smart contract must not trust off-chain math. Off-chain detects; on-chain verifies.

## Atomic call template

```text
executeStrategy(params)
  validate caller
  validate deadline / maxBlockNumber
  validate route/token allowlists
  borrow flashloan
    callback:
      validate lender callback
      execute swap route
      repay principal + fee
      assert finalBalance >= initialBalance + minProfit
  emit Profit
```

Practice task:

```text
Write a pseudo-transaction plan object:
{
  chain_id,
  lender,
  borrow_token,
  borrow_amount,
  route_steps[],
  min_profit,
  max_block,
  max_fee_per_gas,
  target_private_tx_hash,
  bundle_body
}
```

Then write a Solidity skeleton that can execute that plan on a fork.

Foundry is the best practice environment here. Foundry fork testing supports running tests against a forked chain via `forge test --fork-url`, selecting pinned block numbers, and using fork cheatcodes such as `createSelectFork` and `selectFork`; this is exactly what you need before live execution. ([foundry - Ethereum Development Framework][9])

---

# 2. Repo/source curriculum

## A. MEV-Share core curriculum

| Learn                      | Source                                            | Practice                   |
| -------------------------- | ------------------------------------------------- | -------------------------- |
| MEV-Share node, hints, SSE | Flashbots Getting Started + Event Stream          | Build SSE listener         |
| Bundle model               | Understanding Bundles                             | Build JSON bundle model    |
| Blind backrun example      | `flashbots/simple-blind-arbitrage`                | Reproduce flow in shadow   |
| Rust MEV bot framework     | `paradigmxyz/artemis`, `paradigmxyz/mev-share-rs` | Study collectors/executors |

Flashbots docs mention that Rust users can use Paradigm’s MEV-Share Rust client, and that Artemis is a complete MEV bot framework with built-in MEV-Share support. ([Flashbots Docs][1]) Artemis itself describes the repo as “a simple, modular, and fast framework for writing MEV bots in Rust.” ([GitHub][10])

OpenSrc:

```bash
opensrc fetch \
  flashbots/simple-blind-arbitrage \
  flashbots/mev-share \
  flashbots/mev-share-client-ts \
  paradigmxyz/mev-share-rs \
  paradigmxyz/artemis
```

---

## B. Flashloan / flash-swap curriculum

| Learn                  | Source                                  | Practice                           |
| ---------------------- | --------------------------------------- | ---------------------------------- |
| Balancer flashloan     | Balancer docs + monorepo                | Borrow/repay on fork               |
| Aave V3 flashloan      | Aave V3 core                            | Implement receiver on fork         |
| UniV2 flash swap       | UniV2 docs/periphery                    | Implement `uniswapV2Call`          |
| UniV3 flash            | UniV3 periphery                         | Implement `uniswapV3FlashCallback` |
| Community arb patterns | Haehnchen / yuyasugano / kaymen99 repos | Study guards and latency notes     |

OpenSrc:

```bash
opensrc fetch \
  balancer/balancer-v2-monorepo \
  aave/aave-v3-core \
  aave/aave-address-book \
  Uniswap/v2-periphery \
  Uniswap/v3-periphery \
  Haehnchen/uniswap-arbitrage-flash-swap \
  yuyasugano/pancake-bakery-arbitrage \
  kaymen99/aave-flashloan-arbitrage
```

---

## C. AMM / DEX math curriculum

| Learn                          | Source                                    | Practice                         |
| ------------------------------ | ----------------------------------------- | -------------------------------- |
| UniV2 constant product         | `Uniswap/v2-core`, `Uniswap/v2-periphery` | Implement `getAmountOut` in Rust |
| V2 event decoding              | `Swap`, `Sync`, `PairCreated`             | Build pool registry              |
| V3 ticks/liquidity             | `Uniswap/v3-core`                         | Decode `slot0` and Swap          |
| Balancer weighted/stable pools | Balancer monorepo/docs                    | Quote routes later               |
| Curve stableswap               | `curvefi/curve-router-ng`                 | Shadow quote later               |

OpenSrc:

```bash
opensrc fetch \
  Uniswap/v2-core \
  Uniswap/v2-periphery \
  Uniswap/v3-core \
  Uniswap/v3-periphery \
  balancer/balancer-v2-monorepo \
  curvefi/curve-router-ng
```

Practice tasks:

```text
1. Implement UniV2 getAmountOut in Rust.
2. Unit test it against UniswapV2Library.
3. Decode Swap and Sync logs.
4. Build pair registry from PairCreated logs.
5. Store pair → token0/token1/reserves in Postgres.
```

---

## D. Low-latency Rust curriculum

| Learn                | Source            | Practice                                 |
| -------------------- | ----------------- | ---------------------------------------- |
| MEV bot architecture | Artemis           | Build collector/strategy/executor traits |
| EVM RPC in Rust      | Alloy             | Implement provider, logs, calls          |
| Fast async           | Tokio             | Run SSE + block scanner concurrently     |
| DB writes            | SQLx              | Async event insert pipeline              |
| Observability        | tracing + metrics | Prometheus counters                      |

Alloy is the modern Rust EVM stack you should use for providers/logs/calls, while Reth is a later optimization path if provider cost/latency becomes a bottleneck. Reth describes itself as a modular, contributor-friendly, blazing-fast Ethereum protocol implementation in Rust. ([GitHub][11])

OpenSrc:

```bash
opensrc fetch \
  alloy-rs/alloy \
  paradigmxyz/artemis \
  paradigmxyz/reth \
  crates:tokio \
  crates:sqlx \
  crates:tracing \
  crates:metrics \
  crates:metrics-exporter-prometheus
```

Practice tasks:

```text
1. Build one Tokio app with 3 tasks:
   - MEV-Share SSE collector
   - Ethereum block collector
   - Postgres writer
2. Add bounded channels.
3. Add backpressure.
4. Add Prometheus metrics:
   - events_ingested_total
   - decode_errors_total
   - db_write_latency_ms
   - candidate_count_total
```

---

## E. Simulation / replay curriculum

| Learn        | Source             | Practice                      |
| ------------ | ------------------ | ----------------------------- |
| Fork testing | Foundry docs       | Reproduce historical tx state |
| Anvil fork   | Foundry            | Local execution testing       |
| Revm         | `bluealloy/revm`   | Later local EVM sim           |
| Reth         | `paradigmxyz/reth` | Later fast local node/indexer |

Practice tasks:

```text
1. Pick one historical V2 swap.
2. Fork at previous block.
3. Replay pool state.
4. Simulate a hypothetical arbitrage.
5. Compare predicted output vs fork result.
6. Log prediction error.
```

Success criteria:

```text
median replay error <= 10%
p95 replay error <= 20%
revert reason captured
gas estimate stored
```

---

## F. Machine learning curriculum

ML comes **after** you have data. It is not day-one execution logic.

Learn these ML tasks:

| ML task                   | Why it matters                                    |
| ------------------------- | ------------------------------------------------- |
| False-positive classifier | identify candidates likely to die in replay       |
| Profitability ranker      | prioritize which candidates deserve expensive sim |
| Token-risk classifier     | avoid honeypots / FoT / scam tokens               |
| Gas/bribe survival model  | estimate if candidate survives competitive bid    |
| Strategy bandit           | allocate compute to best chain/DEX/strategy       |
| Drift monitor             | know when an edge stopped working                 |

Sources:

```bash
opensrc fetch \
  catboost/catboost \
  online-ml/river \
  rust-ml/linfa \
  smartcorelib/smartcore \
  pykeio/ort
```

Practice task:

```text
Do not train model first.

First collect:
- candidate features
- replay result
- label_profitable
- label_false_positive
- label_toxic_token
- prediction_error
```

Then train:

```text
1. Logistic regression baseline
2. CatBoost ranker/classifier
3. ONNX export for Rust inference later
```

Important rule:

```text
ML ranks candidates.
ML never overrides deterministic safety.
```

---

# 3. 12-week practice roadmap

## Weeks 1–2 — MEV-Share ingestion

Goal:

```text
Understand MEV-Share and collect real data.
```

Build:

```text
SSE listener
historical hint fetcher
raw event table
event classifier
daily stats report
```

Read:

```text
Flashbots Getting Started
Flashbots Event Stream
Flashbots simple-blind-arbitrage
```

Deliverable:

```text
10k+ events stored
distribution of hint visibility
DEX-relevant event count
```

---

## Weeks 3–4 — V2 pool math and registry

Goal:

```text
Understand v2 AMM math and pool discovery.
```

Build:

```text
UniswapV2 getAmountOut in Rust
PairCreated backfill
Swap/Sync decoder
pool state table
```

Read:

```text
Uniswap/v2-core
Uniswap/v2-periphery
Sushi v2
```

Deliverable:

```text
pool registry for WETH/base long-tail pairs
reserve snapshots
basic cross-venue price comparison
```

---

## Weeks 5–6 — Backrun candidate detector

Goal:

```text
MEV-Share hint → impacted pool → alternate venue → candidate.
```

Build:

```text
backrun-v1 strategy
candidate_opportunities table
PnL accountant
gas/bribe/slippage model
```

Read:

```text
Flashbots simple-blind-arbitrage
Haehnchen flash-swap repo
```

Deliverable:

```text
100+ candidates scored
full net PnL formula
daily top candidates report
```

---

## Weeks 7–8 — Flashloan feasibility and fork replay

Goal:

```text
Know whether flashloan funding would help.
```

Build:

```text
Balancer fee/liquidity model
Aave fee/liquidity model
UniswapV2 flash-swap model
Foundry fork replay harness
```

Read:

```text
Balancer flash loans
Aave V3 core
Uniswap flash swaps
Foundry fork testing
```

Deliverable:

```text
flashloan feasibility field per candidate
replay result per candidate
prediction error dashboard
```

---

## Weeks 9–10 — Executor skeleton, still no live

Goal:

```text
Write executor, but only fork-test it.
```

Build:

```text
FlashloanBackrunExecutor.sol
BalancerFlashLoanAdapter
AaveFlashLoanSimpleAdapter
UniswapV2FlashSwapAdapter
Guards.sol
```

Guards:

```text
minProfit
maxBlockNumber
callback validation
token allowlist
route allowlist
pause
```

Deliverable:

```text
fork tests passing
revert on negative profit
revert on wrong callback
revert on stale block
```

---

## Weeks 11–12 — ML feature dataset + go/no-go

Goal:

```text
Decide if there is an edge.
```

Build:

```text
ML feature export
false-positive baseline
candidate ranking report
strategy/chain comparison report
```

Go-live criteria:

```text
1000+ DEX-relevant events
100+ candidates
20+ fork-replayed candidates
prediction error acceptable
at least one repeated category survives:
  gas + bribe + slippage + flashloan fee + safety buffer
```

No-go criteria:

```text
all candidates die after costs
only toxic tokens look profitable
sim/replay mismatch too high
latency too slow
RPC costs too high
```

---

# 4. The exact material list to learn

## Must read first

1. **Flashbots MEV-Share Getting Started** — understand node, hints, transaction hash replacement, and why MEV-Share is not normal mempool search. ([Flashbots Docs][1])
2. **Flashbots MEV-Share Event Stream** — understand SSE, optional fields, historical hints, Ethereum transaction scope. ([Flashbots Docs][2])
3. **Flashbots Understanding Bundles** — understand bundle structure and why backrun tx is paired with user tx hash. ([Flashbots Docs][3])
4. **Flashbots simple-blind-arbitrage repo** — closest public implementation reference for your first strategy. ([GitHub][4])
5. **Uniswap V2 Flash Swaps** — understand atomic no-upfront-capital flash swap and capital-free arbitrage. ([Uniswap Developers][7])
6. **Balancer Flash Loans** — understand Vault flashloan flow, 0-fee current assumption, and callback validation. ([Balancer][6])
7. **Foundry Fork Testing** — understand fork testing, pinned blocks, caching, and multi-fork cheatcodes. ([foundry - Ethereum Development Framework][9])

## Must clone/fetch

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

---

# 5. Final ARR realism

To reach **$1M ARR**, your learning goal cannot be only:

```text
I run a flashloan bot.
```

It must become:

```text
I build a proprietary MEV intelligence and execution system.
```

Possible $1M ARR routes:

| Path                          | How it reaches revenue                          |
| ----------------------------- | ----------------------------------------------- |
| Proprietary searcher          | high PnL, hardest, private edge required        |
| Searcher infrastructure SaaS  | sell simulation/replay/risk/monitoring to teams |
| Strategy intelligence product | sell chain/DEX/token opportunity analytics      |
| Protocol integration          | backrun/OEV/keeper service for protocols        |
| Risk scanner                  | sell toxic-token/honeypot/MEV-risk scoring      |
| Managed searcher infra        | run strategies for capital partners             |

The first product should still be:

```text
Rust MEV-Share Backrun Shadow Searcher
```

But the long-term company should become:

```text
MEV intelligence + simulation + execution infrastructure
```

That is the more realistic $1M ARR direction.

[1]: https://docs.flashbots.net/flashbots-mev-share/searchers/getting-started "Getting Started | Flashbots Docs"
[2]: https://docs.flashbots.net/flashbots-mev-share/searchers/event-stream "Event Stream | Flashbots Docs"
[3]: https://docs.flashbots.net/flashbots-mev-share/searchers/understanding-bundles "Understanding Bundles | Flashbots Docs"
[4]: https://github.com/flashbots/simple-blind-arbitrage "GitHub - flashbots/simple-blind-arbitrage · GitHub"
[5]: https://github.com/Haehnchen/uniswap-arbitrage-flash-swap "GitHub - Haehnchen/uniswap-arbitrage-flash-swap: Uniswap flash swap arbitrage solidity contracts · GitHub"
[6]: https://docs-v2.balancer.fi/reference/contracts/flash-loans.html "Flash Loans | Balancer"
[7]: https://docs.uniswap.org/contracts/v2/concepts/core-concepts/flash-swaps "Flash Swaps | Uniswap Developers"
[8]: https://arxiv.org/abs/2312.01091?utm_source=chatgpt.com "Demystifying DeFi MEV Activities in Flashbots Bundle"
[9]: https://book.getfoundry.sh/forge/fork-testing "foundry - Ethereum Development Framework"
[10]: https://github.com/paradigmxyz/artemis "GitHub - paradigmxyz/artemis: A simple, modular, and fast framework for writing MEV bots in Rust. · GitHub"
[11]: https://github.com/alloy-rs/alloy "GitHub - alloy-rs/alloy: Transports, Middleware, and Networks for the Alloy project · GitHub"

