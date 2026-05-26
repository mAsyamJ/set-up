# CoW Protocol Shadow Solver Engine — Technical Implementation Brief (Rust, 14-Day Validation)

## TL;DR
- A solo developer **can** run a shadow solver against live CoW Protocol orderflow without onboarding, KYC, or bonding: the public orderbook API exposes `GET /api/v1/auction` and `GET /api/v1/solver_competition/{auction_id}` (and `/latest`), which is sufficient to listen to auctions, compute candidate solutions locally, and compare your score against the winning solver's score for shadow validation. The `/api/v1/auction` endpoint is documented as "currently permissioned" but `/solver_competition` is public, and the autopilot binary supports a `--shadow https://api.cow.fi/mainnet` flag designed exactly for this use case.
- The 2026 scoring rule is precise and reproducible from public data: per CIP-38/CIP-65/CIP-67, `score(sell order) = (surplus + protocol_fees) · p(buy_token)` and `score(buy order) = (surplus + protocol_fees) · p(buy_token) · π` denominated in the chain's native token; winners are chosen via a Fair Combinatorial Auction (CIP-67) with reference scores; payment is `cap(totalScore − referenceScore_i − missingScore_i)` with chain-specific caps (β=50%, c_l=0.010 ETH on Ethereum/Arbitrum/Base). Implementation-ready, but the **fairness-filtering pass over competitor bids cannot be reproduced** without knowing competitors' counterfactual bids — so shadow comparison must be framed as "would my score have beaten the winning solution's reported score" rather than "would I have won the combinatorial auction."
- Full onboarding is **prohibitive for a solo developer**: the CoW DAO bonding pool requires $500K stables + 1.5M COW (reduced pool: $50K stables/ETH + 500K COW growing to $100K + 1M COW over 12 months), KYC of company beneficial owners and developer passports, and an Arbitrum-first start gated by an onboarding call — but **shadow participation is explicitly designed to be possible without any of this**, and the docs say "no prerequisites (other than KYC if joining the CoW DAO bonding pool)" beyond having a working solver before shadow.

## Key Findings

### Priority 1 — CoW Protocol Architecture & Auction Mechanics

**1.1 Three-component architecture (autopilot / driver / solver engine).** From `docs.cow.fi/cow-protocol/tutorials/arbitrate`:
- **Autopilot** "cuts" auctions: pulls solvable orders from the shared PostgreSQL DB, fetches native token prices, filters unsettleable orders, sends `/solve` requests to every registered driver, collects scored solutions, picks the winner by highest score, and calls `/settle` on the winning driver. There is "a single autopilot running for each chain" plus a "barn" (staging) autopilot per network.
- **Driver** is "a plug-and-play component" between autopilot and solver engine. It augments the auction with metadata (token decimals, balance checks, AMM liquidity indexing), forwards to the solver engine, picks the best of multiple solutions returned, simulates them on the latest block, scores them, and — if it wins — handles on-chain submission. Open-source Rust implementation in the `driver` crate of `cowprotocol/services`.
- **Solver Engine** "implements the matching system of the CoW Protocol batch auction" — pure matching logic, language-agnostic (must expose the HTTP API in `crates/solvers/openapi.yml`). Reference Rust implementation in the `solvers` crate, with `Baseline` (single-order, on-chain liquidity, greedy single-path output maximization in a token graph) and `Legacy` modes.

**1.2 Batch auction lifecycle.** Per `docs.cow.fi/cow-protocol/tutorials/arbitrate/autopilot` and the blockchain-wiki/MetaLamp explainers:
1. Autopilot triggers a new auction on (a) order placement/cancellation/update events, (b) every new block, or (c) every ~2 seconds if no new block arrived.
2. Autopilot sends `/solve` to all registered drivers in parallel.
3. **Solve deadline ≈ 15 seconds by default, configurable via `solve_deadline` in the autopilot config.** Solvers can submit multiple solutions; the driver merges disjoints and forwards the highest-scoring one.
4. Autopilot collects scores, applies fair-combinatorial filtering (CIP-67), selects winner(s), calls `/settle`.
5. Winning driver builds the settlement transaction and submits it; the autopilot deadline is "a specific number of blocks after the current block at the time of sending the `settle` request" (network-dependent — see competition-rules doc).

**1.3 Scoring rule (2026, post-CIP-67, post-CIP-65, per CIP-38).** From `docs.cow.fi/cow-protocol/reference/core/auctions/the-problem`:

> "The score of a solution is equal to the sum of scores of the orders the solution proposes to execute, where the score of an order o is defined as:
> - sell order or CoW-AMM order: **score(o) = (U(o) + f(o)) · p(b)**
> - buy order: **score(o) = (U(o) + f(o)) · p(b) · π**"

where `U(o)` is order surplus (sell: `x − y/π`; buy: `x·π − y`), `f(o)` is protocol fee, `p(b)` is the externally-provided native-token price of the buy token (from `Auction.prices`), and `π` is the order's limit price (`limit_buy_amount / limit_sell_amount`).

**Winner selection (Fair Combinatorial Auction, CIP-67).** Per `docs.cow.fi/cow-protocol/reference/core/auctions/competition-rules`: bids are split into per-directed-token-pair "reference bids" and multi-pair "batched bids"; for each directed pair the highest-scoring single-pair bid is the **reference outcome**; batched bids are **filtered out if they generate lower score on any directed pair than the reference outcome**; the winner set is the surviving combination that maximizes total score, subject to "all orders on the same directed token pair must be part of the same winning bid."

**Reward formula.** Per `docs.cow.fi/cow-protocol/reference/core/auctions/rewards`:

> `performanceReward_i = cap(totalScore − referenceScore_i − missingScore_i)`

where `referenceScore_i` is the total score of a counterfactual auction with all of solver i's bids removed, `missingScore_i` is solver i's winning-but-reverted score, and `cap(x) = max(−c_l, min(c_u, x))` with **β=50%, c_l=0.010 ETH on Ethereum mainnet, Arbitrum, and Base** (Gnosis: β=100%, 10 xDAI; Polygon: 100%, 30 POL; BNB: 100%, 0.04 BNB; Linea/Ink: 100%, 0.0015 ETH). `c_u` is β × protocol-fee earned in that auction.

**EBBO.** "Ethereum Best Bid and Offer" — the social-consensus rule (CIP-11) that the UDCP a solver produces must be at least as good as what baseline liquidity (a documented set of AMMs and base tokens per chain) would have produced. Violations are detected post-facto; reimbursement is the solver's obligation; systematic violation can lead to slashing.

**1.4 Orderbook API.** Base URLs (per `docs.cow.fi/cow-protocol/integrate/api`):
- Mainnet (prod): `https://api.cow.fi/mainnet` — staging: `https://barn.api.cow.fi/mainnet`
- Gnosis Chain: `https://api.cow.fi/xdai` (staging `barn.api.cow.fi/xdai`)
- Arbitrum One: `https://api.cow.fi/arbitrum_one`
- Base: `https://api.cow.fi/base`
- Plus Avalanche, Polygon, BNB, Sepolia, Lens, Linea, Ink, Plasma.

Endpoints needed for shadow mode (verified from `services/v2.320.0/crates/orderbook/openapi.yml`):
- `GET /api/v1/auction` → `Auction { id: int, block: int, orders: AuctionOrder[], prices: {token → BigUint (native-denominated, 1e18 = 1:1)}, surplusCapturingJitOrderOwners: address[] }`. **Marked "currently permissioned. Reach out in discord if you need access."**
- `GET /api/v1/solver_competition/{auction_id}` and `/api/v1/solver_competition/latest` (both deprecated in favor of `/api/v2/...` but still live) → `SolverCompetitionResponse { auctionId, auctionStartBlock, transactionHashes[], referenceScores: {solver → BigUint}, auction: CompetitionAuction, solutions: SolverSettlement[] }`. Each `SolverSettlement` exposes `ranking, solverAddress, score, referenceScore, txHash, clearingPrices, orders[{id, sellAmount, buyAmount}], isWinner, filteredOut`. **No more `callData` / `uninternalizedCallData` fields** — they were removed in recent versions.
- `GET /api/v1/orders/{UID}` → full `Order` (OrderCreation + OrderMetaData) including `status ∈ {presignaturePending, open, fulfilled, cancelled, expired}`, `executedSellAmount`, `executedBuyAmount`, `executedFee`, `class ∈ {market, limit, liquidity}`.
- `POST /api/v1/quote` → `OrderQuoteResponse { quote: OrderParameters, expiration, id, verified }` — pipes into the price-estimation solver competition, returns either `fast` or `optimal` quality.
- `GET /api/v2/trades`, `GET /api/v1/orders/tx/{txHash}`, `GET /api/v1/token/{token}/native_price`.

Authentication: most endpoints are public; only order creation/cancellation requires EIP-712 / EIP-1271 / ethsign / pre-sign signatures. Rate limiting via HTTP 429. The SDK uses `partners.cow.fi` (prod) / `partners.barn.cow.fi` (staging) with an `X-API-Key` header for partner integration, but this is **not required for read-only shadow operation**.

**1.5 Order data model.** From `docs.cow.fi/cow-protocol/reference/contracts/core/settlement` and the OpenAPI spec, the canonical `GPv2Order.Data` struct (and the on-the-wire shape):
```
sellToken      address  (ERC-20)
buyToken       address  (ERC-20)
receiver       address  (nullable — null means owner gets proceeds)
sellAmount     uint256  (atoms)
buyAmount      uint256  (atoms)
validTo        uint32   (unix epoch seconds)
appData        bytes32  (IPFS CID hash of off-chain JSON metadata)
feeAmount      uint256  (always 0 for current orders — solver computes fee dynamically)
kind           bytes32  ("sell" or "buy")
partiallyFillable bool
sellTokenBalance bytes32 ("erc20" | "external" (Balancer Vault allowance) | "internal" (Balancer internal))
buyTokenBalance  bytes32 ("erc20" | "internal")
```
Plus orderbook-only fields: `signature`, `signingScheme ∈ {eip712, ethsign, presign, eip1271}`, `from`, `class ∈ {market, limit, liquidity}`. `orderUid` (56 bytes) = `orderDigest || owner || validTo`. Settlement domain separator: `name="Gnosis Protocol", version="v2", verifyingContract=0x9008D19f58AAbD9eD0D60971565AA8510560ab41` (the GPv2Settlement contract — same address all EVM chains).

**Solver-engine `/solve` response (solution object).** From `crates/solvers/openapi.yml` and the docs on settlement:
- `trades[]`: list of `{orderUid, executedAmount, fee?}` for fill quantities.
- `interactions[]`: ordered list of `{target, value, callData, allowances?}` describing on-chain calls (token approvals, AMM swaps, etc.) to execute as part of the settlement.
- `prices`: `{token → uniform_clearing_price}` — must respect UDCP per CIP-38: `(Y − f − f_p,sell)/(X + f_p,buy) = p_B / p_A` for every trade selling A→B.

**1.6 Onboarding gate (full vs. reduced bonding pool).** Per `docs.cow.fi/cow-protocol/reference/core/auctions/bonding-pools` and the onboarding guide:
- **Full bonding pool:** safe must hold **$500,000 USD in (yield-bearing) stablecoins + 1,500,000 COW.**
- **Reduced bonding pool (CIP-44):** initial **$50,000 in (yield-bearing) stables or ETH + 500,000 COW**, ramped over the following year to **$100,000 + 1,000,000 COW.** Still formally under CoW DAO; gives the solver control of calldata/submission.
- KYC: company incorporation, shareholder details, 1-2 passports of main shareholders/developers; takes 1–3 working days.
- Service fee (CIP-48): **15% of weekly COW rewards** withheld, starting 6 months after joining.
- Onboarding-call agenda includes "locking 25% of the weekly rewards."
- Solvers under the CoW DAO pool start on **Arbitrum first**; mainnet requires further evaluation later.
- **Shadow mode is explicitly available without any of this.** From the onboarding doc: *"In the shadow competition (only arbitrum and mainnet now) the solver is tested using production order flow but without settling any orders. This is for testing the integration of the solver."* And: *"In order to get connected to the shadow competition, feel free to reach out to an admin of the 'CoW Swap Solvers' group on Telegram."* The autopilot binary supports `--shadow https://api.cow.fi/mainnet` to consume production auctions for local shadowing without any whitelist.

**Verdict (for a solo dev):** Onboarding is **prohibitive** for a solo developer at the $50K + 500K COW reduced-pool entry point (≈$200K+ USD-equivalent at typical 2025-26 COW prices) — but **shadow mode does not require it**, and the entire 14-day validation can be completed read-only without any bond, KYC, or whitelist beyond an optional Telegram-mediated firewall whitelist that is also unnecessary if you simply poll `/api/v1/auction` and `/api/v1/solver_competition/latest`.

**1.7 Reference implementations.**
- `cowprotocol/services` (Rust, GPL-3.0-or-later) — production code for autopilot, orderbook, driver, solvers. Uses **Tokio**, **PostgreSQL**, **Alloy** for blockchain interactions, **jemalloc** with heap profiling, **tokio-console** support. The `solvers` crate ships a `Baseline` reference engine (greedy single-path output maximization over base-token graph).
- `cowprotocol/solver-template-py` — Python framework, but README warns: *"This repository is outdated and does not currently function as a basis for implementing a solver."* Do not use as starting point in 2026.
- Use `cowprotocol/services` `crates/solvers/openapi.yml` as the authoritative `/solve` interface contract, and use `playground/docker-compose.fork.yml` for end-to-end local testing.

### Priority 2 — DEX Routing & Quoting

**2.1 Aggregator-API-first recommendation.** For a 14-day validation, calling an aggregator API (1inch, 0x, Paraswap, or **the CoW `/api/v1/quote` endpoint itself**) is dramatically simpler than running RPC quoter calls. CoW's own `/quote` piggy-backs on the production price-estimation competition and returns a verified, simulated quote — ideal as a **baseline reference quote** for your shadow comparison.

**2.2 RPC quoter contracts (for direct-route generation).**
- **Uniswap v3 QuoterV2** (mainnet `0x61fFE014bA17989E743c5F6cB21bF9697530B21e`): `quoteExactInputSingle(QuoteExactInputSingleParams) → (amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate)` and `quoteExactInput(path, amountIn) → (amountOut, sqrtPriceX96AfterList, ticksCrossedList, gasEstimate)`. Must be called via `eth_call` (state-changing internally, reverts to return value) — equivalent to `callStatic` in ethers / `.call().await` in alloy.
- **Uniswap v3 Quoter v1** (mainnet `0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6`): simpler signature, no gas estimate.
- **Uniswap v2**: `IUniswapV2Router02.getAmountsOut(amountIn, path[])` — pure view function, cheap.
- **Uniswap v4**: state-view library + Universal Router quoting; in 2026 still less mature than v3 for off-chain quoting — recommend deferring.
- **Balancer V2**: `Vault.queryBatchSwap(kind, swaps, assets, funds)` — call via `eth_call`, simulates batch swap without executing.
- **Curve**: per-pool `get_dy(i, j, dx)` or `get_dy_underlying(i, j, dx)`.

For shadow validation, **start with CoW `/quote` + Uniswap v2 `getAmountsOut` only**, since they cover ≥90% of routing scenarios and are dead-simple from Rust via alloy `sol!` macro bindings.

### Priority 3 — Rust Crate Landscape (May 2026)

**3.1 EVM RPC: use `alloy`.** `ethers-rs` is **officially deprecated** (issue #2667 on `gakonst/ethers-rs`: *"ethers-rs is deprecated in favor of Alloy and Foundry"*). Alloy 1.0 (Paradigm, May 2025) is the canonical successor: 35–60% faster U256 arithmetic on AMM math, with static ABI encoding up to 10× faster (dynamic ABI encoding sees ~10% improvement), per Paradigm's "Introducing Alloy v1.0" (May 15, 2025): *"Static ABI encoding is up to 10x faster in Alloy, while dynamic ABI encoding sees around 10% improvement."* Used by **CoW Protocol's own `services` repo for blockchain interactions**, plus Reth, Foundry, Revm. MSRV 1.85+. Add via `alloy = { version = "1", features = ["full"] }`.

**3.2 Recommended Rust stack for the shadow solver.**
- **`tokio`** (async runtime) — standard, used by `services`.
- **`reqwest`** (HTTP client) — pairs with tokio; use for orderbook polling and Telegram/Discord webhooks.
- **`serde` + `serde_json`** — required for OpenAPI-typed orderbook/solver-competition payloads. Define structs mirroring `Auction`, `SolverCompetitionResponse`, `AuctionOrder` from the openapi.yml.
- **`sqlx`** vs **`rusqlite`** for the shadow-result log: **`sqlx` with the `sqlite` feature** is the better choice for an async event-driven service (compile-time-checked queries, async-native, integrates with tokio). `rusqlite` is sync and would force `tokio::task::spawn_blocking` per write — acceptable for low-volume logging but ergonomically worse. For a 14-day shadow logger writing ~once per auction (every ~15s), either works; pick `sqlx` for consistency with the async stack.
- **`tracing` + `tracing-subscriber`** for structured logging (used by `cowprotocol/services`).
- **`axum`** for the health/metrics HTTP endpoint (used in CoW services indirectly; the standard tokio HTTP server framework as of 2026).
- **`metrics` + `metrics-exporter-prometheus`** for Prometheus-format metrics scrape endpoint.
- **`ratatui`** for an optional TUI (the maintained successor to `tui-rs`). For a 14-day project, this is "nice to have" — a colored stdout via `tracing` is often sufficient.
- **Alerting:** simple Telegram bot via `reqwest` to `https://api.telegram.org/bot<token>/sendMessage`, or Discord via webhook POST. No special crate needed.

### Priority 4 — Secondary (Later-Roadmap) Topics

**4.1 Chainlink SVR (Smart Value Recapture).** Backruns Chainlink oracle updates for OEV. Originally Ethereum-only via Flashbots MEV-Share; subsequently expanded to Base, Arbitrum, BNB Chain via the **Atlas auction system** (originally developed by FastLane Labs, then acquired by Chainlink Labs in early 2026 per PR Newswire's "Chainlink Acquires Atlas by FastLane to Increase Revenue for DeFi": *"Acquisition of Atlas IP and key personnel brings proven onchain order flow infrastructure under the Chainlink standard"*). *"The oracle report sent to the SVR-enabled Price Feed transmits updates onchain via Flashbots MEV-Share, where the right to bundle a liquidation transaction with the oracle report update is auctioned to searchers in a permissionless manner."* — `blog.chain.link/chainlink-smart-value-recapture-svr/`. Per Chaos Labs' SVR Monitoring Platform (launched May 14, 2025, `chaoslabs.xyz/posts/svr-monitoring-platform`): *"the recapture rate has remained relatively low at only 20.9%, with the majority of value being captured by liquidators rather than the protocol."* Searcher onboarding documented at the Atlas docs.

**4.2 RedStone Atom OEV auction.** Sealed-bid auction, ~300ms window, settled atomically with the price update in a single transaction on **FastLane Atlas**. *"Solvers / Liquidators bid for the right to liquidate. The highest bid wins, and a single atomic transaction bundles three actions: the price update, the liquidation execution, and the OEV payment to the protocol"* — `blog.redstone.finance/2026/05/05/what-is-oracle-extractable-value-oev/`. Active across Unichain, BNB Chain, Base, HyperEVM, Berachain (per launch announcement July 2025); permissionless searcher participation via Atlas.

**4.3 Flashbots MEV-Share SSE event stream.** Pending-transaction hints (txHash, optionally calldata/logs/functionSelector/contractAddress per sender's privacy prefs) over Server-Sent Events at `https://mev-share.flashbots.net`. Default hints expose pair contract address in logs for Uniswap V2/V3, Curve, Balancer swaps. Backrun bundles submitted via `mev_sendBundle` RPC at `https://relay.flashbots.net`. Rust client: `paradigmxyz/mev-share-rs` (or Artemis framework).

**4.4 Flash-loan fees.**
- **Aave V3:** `Pool.flashLoanSimple(receiver, asset, amount, params, referralCode)` with `IFlashLoanSimpleReceiver.executeOperation(asset, amount, premium, initiator, params)` callback. Premium is **0.05% (5 bps)** by default for the standard Pool (`FLASHLOAN_PREMIUM_TOTAL`); the `FLASHLOAN_PREMIUM_TO_PROTOCOL` is initialized to 0 (i.e. all premium goes to LPs at launch but governance can route some to treasury).
- **Balancer V2:** `Vault.flashLoan(IFlashLoanRecipient recipient, IERC20[] tokens, uint256[] amounts, bytes userData)` with `receiveFlashLoan(tokens, amounts, feeAmounts, userData)` callback. Vault address `0xBA12222222228d8Ba445958a75a0704d566BF2C8` (same on all chains). **Fee: 0%** — per Orb (Balancer Protocol on Medium, `medium.com/balancer-protocol/capitalizing-on-balancers-flash-loans-ddb17dec6958`): *"In contrast to other protocols that charge a fee for performing flash loans, Balancer offers zero fee flash loans... at deployment flash loans fees were set to zero, and at the time of writing they have still not been activated by the governance."*
- CoW Protocol solvers integrate flash loans via the **flash-loan-router** contract (`cowprotocol/flash-loan-router`), which lets the settle function execute inside a flash-loan callback. Supports Aave and ERC-3156-compatible providers.

## Details

### Exact data flow for the shadow engine (14-day implementation)

```
┌─────────────────┐    poll /api/v1/auction     ┌──────────────────────┐
│  api.cow.fi     │ ◀───────────────────────────│  Shadow Solver       │
│   (mainnet)     │    every ~3s (sync to block)│  (Rust, tokio)       │
└─────────────────┘                             │                      │
        │                                       │   1. Parse Auction   │
        │ /api/v1/solver_competition/latest     │   2. For each order: │
        ├──────────────────────────────────────▶│      a. CoW /quote   │
        │  (after settlement, ~30-60s later)    │      b. Direct fill  │
        ▼                                       │      c. UniV2 1-hop  │
┌─────────────────────────┐                    │      d. UniV2 2-hop  │
│ winning solver score    │                    │   3. Compute score   │
│ + reference scores      │                    │      per CIP-38/65   │
│ from solver_competition │                    │   4. Compare vs.     │
└─────────────────────────┘                    │      winner          │
                                               │   5. Log to SQLite   │
                                               │   6. Emit metrics    │
                                               └──────────────────────┘
                                                        │
                                                        ▼
                                                  ┌──────────────┐
                                                  │ Prometheus/  │
                                                  │ Telegram     │
                                                  └──────────────┘
```

### Score reproducibility — what can and cannot be reproduced

**Can reproduce from public data:**
- Per-solution score, given `Auction.prices` (native-denominated buy-token prices) and your computed `executedAmount`s + protocol fees. Formula is fully documented.
- Direct comparison `(my_score − winner_score)` and `(my_score − referenceScore_i)` since the orderbook response exposes `score`, `referenceScore`, and `referenceScores` map.

**Cannot fully reproduce:**
- The **fairness-filtering pass** (CIP-67) requires knowing competitors' *single-pair reference bids* on the same directed token pair. The `SolverCompetitionResponse` exposes only the *winning* solutions plus their final `score` and `referenceScore` — not the per-bid breakdown that would be needed to recompute filtering. So the question "would my bid have been filtered out?" can only be approximated.
- The **`missingScore_i` term** (winning-but-reverted) is post-hoc and depends on on-chain execution outcomes — irrelevant for shadow mode since you never submit.

**Recommendation:** label the shadow comparison "competitive vs. winner" (binary: my_score > winner_score given identical orders & prices) and **flag this as an approximation** in the engine's logs. Do not claim "would have won the auction" — claim "would have produced a higher single-batch score than the winning settlement."

### Concrete polling cadence and shadow protocol

Pseudo-code for the main loop (Rust/tokio):

```rust
let cow = OrderbookClient::new("https://api.cow.fi/mainnet");
let mut interval = tokio::time::interval(Duration::from_secs(3));
let mut last_auction_id: Option<u64> = None;

loop {
    interval.tick().await;
    // 1. Fetch current auction (may be permissioned — see note below).
    let auction = match cow.get_auction().await {
        Ok(a) => a,
        Err(e) => { warn!(?e); continue; }
    };
    if Some(auction.id) == last_auction_id { continue; }
    last_auction_id = Some(auction.id);

    // 2. For every order, generate candidate routes.
    let mut my_score = 0_u128;
    for order in &auction.orders {
        let routes = generate_routes(order, &auction.prices).await;
        let best = routes.into_iter().max_by_key(|r| r.score)?;
        my_score += best.score; // already native-denominated
        log_route_to_sqlite(&order.uid, &best).await;
    }

    // 3. After ~60s, fetch the settled solver_competition for comparison.
    let comp = cow.get_solver_competition_for(auction.id).await?;
    let winner_score: u128 = comp.solutions.iter()
        .filter(|s| s.is_winner).map(|s| s.score).sum();
    log_shadow_result(auction.id, my_score, winner_score, &comp).await;

    // 4. Emit Prometheus + Telegram if win-margin > threshold.
}
```

**Note on `/api/v1/auction` permissioning:** the OpenAPI spec marks it *"currently permissioned"* — if direct access is denied, the alternative is `cowprotocol/services` autopilot binary in `--shadow` mode (which itself fetches auctions from a public-facing autopilot endpoint), or scraping the same data from `/api/v2/solver_competition/{id}.auction` post-settlement (you'd lose real-time-ness but still get full validation data).

### Onboarding decision matrix for a solo dev

| Step | Solo-dev feasibility | Timeline |
|------|---------------------|----------|
| Run shadow locally (`--shadow` autopilot) | ✅ Trivial | Day 1 |
| Join the "CoW Swap Solvers" Telegram and request firewall whitelist | ✅ Easy | Days 1-2 |
| Submit to shadow competition (no on-chain settlement) | ✅ Possible, no KYC | Days 3-14 |
| KYC for production | ⚠️ Requires incorporated company | Weeks 2-4 |
| Reduced bonding pool ($50K + 500K COW initial) | ❌ Capital-prohibitive (~$200K+) | n/a |
| Full bonding pool ($500K + 1.5M COW) | ❌ Capital-prohibitive (~$2M+) | n/a |

## Recommendations

**Stage 1 — Days 1-3 (foundation):**
1. Scaffold a Rust workspace with crates: `core` (types matching openapi.yml), `orderbook-client` (reqwest + serde), `solver` (route generation), `scorer` (CIP-38/65 score), `sink` (sqlx-sqlite + Prometheus).
2. Use `alloy` for any direct on-chain reads (Uniswap v2 `getAmountsOut`, ERC-20 `decimals`).
3. Define structs as exact serde mirrors of `Auction`, `AuctionOrder`, `SolverCompetitionResponse`, `SolverSettlement` from `crates/orderbook/openapi.yml@v2.320.0` — pin the openapi commit hash.
4. **Benchmark:** complete one end-to-end "fetch auction → CoW /quote per order → log" cycle in <2s wall clock against mainnet.

**Stage 2 — Days 4-8 (routing & scoring):**
5. Implement three route generators in order of complexity: (a) CoW `/api/v1/quote` reference (single API call); (b) direct Uniswap v2 fill via `getAmountsOut`; (c) 2-hop through ETH/USDC base token via Uniswap v2.
6. Implement the score function exactly as documented; cross-check against `SolverSettlement.score` for at least 100 settled auctions before trusting the implementation.
7. **Threshold to advance:** for ≥80% of test auctions, the recomputed score for the *winning* settlement matches the API-reported `score` within 1% (rounding tolerance for `BigUint` math).

**Stage 3 — Days 9-12 (shadow comparison + alerting):**
8. Build the comparison: for each settled auction, compute `my_score` for each order using my best route, sum, compare to `winner_score`. Tag each auction as `Competitive | Marginal | NotCompetitive`.
9. Wire Prometheus metrics (`shadow_win_ratio`, `shadow_score_gap_ratio_p50/p95`, `route_generation_latency_ms`) and a Telegram webhook for >5% wins or >50% gap regressions.
10. Add a `ratatui` dashboard if time permits — otherwise skip.

**Stage 4 — Days 13-14 (analysis):**
11. Aggregate: per-pair win-rate, p50/p95 score gap, latency-percentile of route generation, frequency of EBBO-violating outputs (compare my UDCP to baseline-liquidity UDCP).
12. Write a final memo: realistic win-rate, what's blocking competitiveness (CoW matches we missed, private liquidity advantages of incumbents, gas modeling, etc.), and whether a Stage-2 (post-onboarding) project is justified.

**Benchmarks that should change the recommendation:**
- If shadow win-rate <2% across 1000+ auctions → onboarding is not worth $200K+ capital. Pivot or sunset.
- If shadow win-rate 5-15% on a specific token-pair niche → consider applying to a **CoW DAO Grants program** (per `cow.fi/cow-protocol`: *"The CoW DAO Grants program has awarded over $100,000 in grants to innovators that build public DeFi applications with CoW Protocol"*; under CIP-63, approved January 2025 per `grants.cow.fi`, the program allocates a budget of 600,000 xDAI and 1,465,260 COW for grant activities plus an additional 4,990,000 COW for volume grants) before bonding.
- If shadow win-rate >20% on multi-order batches → strong case for raising capital to bond.

## Caveats

1. **`/api/v1/auction` is documented as "currently permissioned"** — *"Note: This endpoint is currently permissioned. Reach out in discord if you need access."* (per the OpenAPI spec). In practice many community projects access it without explicit whitelisting; fallback path is the autopilot `--shadow` mode or post-hoc `/solver_competition/{id}` polling.
2. **Score reproducibility is partial.** The Fair Combinatorial Auction (CIP-67) fairness-filtering step requires data the API does not fully expose. Your shadow engine should clearly label its comparison as "score-vs-winner-score" and not "would-have-won-the-combinatorial-auction." The `referenceScore` field gives an upper bound on the gap a competitor needed to clear.
3. **Solve deadline of 15s is the autopilot default**, not a guarantee. Network-specific configs vary; if your route generation regularly exceeds 5s, you cannot win even competitively-priced routes.
4. **2026 COW token price is not fixed**: the bonding-pool COW component (500K or 1.5M) translates to USD-equivalent capital that fluctuates. Treat the "$200K+" / "$2M+" thresholds as approximate; verify current spot before any capital-allocation decision.
5. **CIP-72 (quote-rewards eligibility):** affects only the quote-side competition, not the solving-side. Mentioned in some sources as "solver only gets a reward if they also bid a matching amount" — applies to quote rewards.
6. **`solver-template-py` is explicitly marked outdated.** Do not start from it. Use `cowprotocol/services` `crates/solvers` (Rust) Baseline as the reference if you need engine-side scaffolding.
7. **EBBO violations** in shadow mode are harmless (no users hurt), but if you graduate to staging/production, the post-facto EBBO test means you may be required to reimburse users within 72 hours. Build the EBBO check into the shadow engine from day 1.
8. **Chainlink SVR / RedStone Atom / MEV-Share / flash loans** are **explicitly out of scope for the 14-day validation**. They are noted only as later-roadmap topics; the shadow solver does not interact with any of them.
9. **`callData` / `uninternalizedCallData` were removed from `SolverSettlement`** in recent versions of the openapi.yml; older blog posts and SDK examples may still reference them. The current schema exposes `txHash` (post-settlement) plus `clearingPrices`, `orders`, `score`, `referenceScore`, `isWinner`, `filteredOut`.
10. **The historical "0.012 ETH" upper cap on solver rewards is no longer current.** The 2026 docs define `c_u = β × protocol-fee` (variable per auction) and `c_l = 0.010 ETH` for Ethereum/Arbitrum/Base. Earlier write-ups citing a flat 0.012 ETH cap are out of date.