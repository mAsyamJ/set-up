# 03 — Chain Collector Model & Strategy Plugin Interface

## Critical rule

> **MEV-Share is the Ethereum collector. Other chains use separate collectors. Do not
> assume multi-chain MEV-Share.**

Each chain implements a `Collector` that emits `NormalizedEvent`s. The rest of the system
does not know or care how an event was sourced.

## Per-chain collectors

| Chain | Collector(s) | Tier | Notes |
|-------|-------------|------|-------|
| **Ethereum** | MEV-Share SSE + historical hint backfill | **BUILD NOW** | Primary private-orderflow signal. Partial-info hints (see `07`). |
| **Base** | block-delta + DEX swap-log + reserve/tick-change scanner | **BUILD NOW** | Shadow only. No MEV-Share. |
| **Arbitrum** | block-delta + DEX swap-log + reserve/tick-change scanner | **BUILD NOW** | Shadow only. No MEV-Share. |
| **BNB Chain** | block-delta scanner | **BUILD LATER** | Optional P1/P2. Shadow only. |
| **Polygon** | block-delta scanner | **BUILD LATER** | Shadow only. |
| **Optimism** | block-delta scanner | **BUILD LATER** | Shadow only. |

## Collector trait

```rust
#[async_trait::async_trait]
pub trait Collector: Send + Sync {
    fn chain(&self) -> ChainId;
    fn kind(&self) -> CollectorKind; // MevShareSse | BlockDelta | SwapLog | Backfill
    /// Long-running task: produce normalized events onto the channel until shutdown.
    async fn run(&self, tx: mpsc::Sender<NormalizedEvent>, shutdown: CancellationToken)
        -> anyhow::Result<()>;
}
```

- **MEV-Share SSE collector:** subscribes to the hint stream; maps each hint to a
  `NormalizedEvent` of kind `MevShareHint`, preserving whatever partial info the hint
  exposes (tx hash, optional logs/selectors/contract addresses).
- **Block-delta collector (L2):** polls new blocks, diffs pool state / scans swap logs
  for the registered v2-style pools, emits `NormalizedEvent`s of kind `SwapObserved` /
  `ReserveChanged`. No private orderflow — these are public, post-inclusion observations
  used to study where mispricing *would* have been backrunnable.
- **Backfill collector (Ethereum):** pulls historical MEV-Share hints (and/or historical
  swaps) to seed the DB so analysis isn't waiting on live accumulation.

## Strategy plugin interface (BUILD NOW: the trait + one impl)

The engine is strategy-pluggable. The trait lives in `crates/strategy-api`; the first and
only V1 implementation is `backrun-v1`.

```rust
#[async_trait::async_trait]
pub trait Strategy: Send + Sync {
    fn id(&self) -> StrategyId;
    fn family(&self) -> StrategyFamily;          // Backrun | CyclicArb | LendingArb | ...
    fn required_inputs(&self) -> Vec<InputKind>; // e.g. [PoolState, AltVenueQuote, Gas]

    async fn detect(&self, event: NormalizedEvent, ctx: StrategyContext)
        -> anyhow::Result<Vec<CandidateOpportunity>>;

    async fn score(&self, candidate: CandidateOpportunity, ctx: ScoreContext)
        -> anyhow::Result<ScoredOpportunity>;

    /// V1: returns a SHADOW plan only (no calldata that gets sent). Live build is LATER.
    async fn build_execution(&self, opp: ScoredOpportunity, ctx: ExecutionContext)
        -> anyhow::Result<ExecutionPlan>;
}
```

### What belongs where (separation of concerns)

| Concern | Lives in | Why |
|---------|----------|-----|
| How an event is sourced/decoded per chain | **Collector + Decoder (core)** | Chain-specific; strategies stay chain-agnostic |
| Which pools/pairs exist, their state | **Pool Registry + State Reader (core)** | Shared by all strategies |
| "Is there an opportunity in this event?" | **Strategy plugin** | The actual edge logic |
| How to quote an alternate venue | **DEX adapter (core)** | Reused across strategies |
| Net PnL math, bribe model | **PnL crate (core)** | Must be identical across strategies |
| Deterministic safety gates | **Risk crate (core)** | Must not be overridable by a strategy |
| How to assemble a (future) tx | **Execution adapter (core, LATER)** | Shared submission machinery |

### How a future strategy is added without touching the core

1. New crate under `crates/strategies/<name>`.
2. Implement `Strategy`.
3. Register it in the worker's strategy list (config-driven).
4. It receives the same `NormalizedEvent`s, uses the same registry/state-reader/PnL/risk.
   The core does not change. (This is the payoff of the plugin design.)

`build_execution` in V1 returns a **shadow** `ExecutionPlan` (a description used for PnL
and logging) — never calldata that is sent anywhere. The live execution adapter is
**DO NOT BUILD YET**.
