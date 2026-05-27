# 09 — Pool Registry & DEX Adapters

**Tier: BUILD NOW for UniswapV2/SushiV2-style.** v3/v4/Balancer/Curve: BUILD LATER.

## Pool registry (BUILD NOW)

A cached lookup from `(chain, pool address)` and `(chain, token0, token1)` → pool
metadata, backed by the `pools` table.

```rust
pub struct PoolRegistry { /* Postgres-backed, in-memory cached */ }

impl PoolRegistry {
    pub async fn by_address(&self, chain: ChainId, addr: Address) -> Option<Pool>;
    pub async fn by_pair(&self, chain: ChainId, a: Address, b: Address) -> Vec<Pool>; // alt venues
    pub async fn upsert(&self, pool: Pool) -> anyhow::Result<()>;
}
```

- **Seeding (BUILD NOW):** a one-off task discovers v2/sushi-v2 pools for the target
  long-tail pairs per chain (via factory `PairCreated` logs over a block range, or a
  curated seed list of WETH/base-token pools) and upserts them.
- **`by_pair` is the key to backrun detection:** given the pool a user swap touched, find
  the *other* venues for the same pair to compute the post-swap arbitrage.
- Cached in-memory (`dashmap`); Postgres is the truth. A miss triggers a side-task lookup;
  it does not block the hot path.

## DEX adapter trait (BUILD NOW: v2 impl)

Adapters encapsulate per-DEX quoting/state math so strategies stay DEX-agnostic.

```rust
#[async_trait::async_trait]
pub trait DexAdapter: Send + Sync {
    fn dex(&self) -> Dex;
    /// Read current pool state needed to quote (v2: reserves).
    async fn read_state(&self, pool: &Pool, provider: &EvmProvider) -> anyhow::Result<PoolState>;
    /// Closed-form output quote given state (v2: x*y=k with fee).
    fn quote_out(&self, state: &PoolState, token_in: Address, amount_in: U256) -> U256;
    /// Required input to receive amount_out (for buy-side / sizing).
    fn quote_in(&self, state: &PoolState, token_out: Address, amount_out: U256) -> U256;
    fn gas_hint(&self) -> u64; // constant per dex (v2 ~ 90-120k per hop)
}
```

### UniswapV2/SushiV2 adapter (BUILD NOW)

- `read_state`: `getReserves()` (and `token0`) via alloy `eth_call`; cache by `(pool,
  block)`.
- `quote_out`: standard constant-product with 0.30% fee:
  `amount_out = (amount_in * 997 * reserve_out) / (reserve_in * 1000 + amount_in * 997)`.
- `quote_in`: inverse formula.
- All integer `U256` math; no floats.

## State reader (BUILD NOW: v2)

A thin layer over `DexAdapter::read_state` that:
- serves the latest cached reserves for hot-path detection,
- falls back to an RPC read on cache miss / staleness,
- records snapshots to `pool_snapshots` for replay + features,
- exposes a **freshness** signal: if the cached/last-read state is older than a configured
  block/time window, mark it stale (the risk engine and PnL treat stale state
  conservatively, and in a future live mode stale state blocks execution).

## v3/v4/Balancer/Curve (BUILD LATER)

- **v3:** tick-based; `read_state` must fetch tick/liquidity; quoting via QuoterV2 (RPC)
  or a local tick-math implementation. More work; deferred until v2 data justifies it.
- **v4:** PoolManager singleton + hooks; off-chain quoting is immature and hook behavior
  must be classified (some hooks internalize MEV). Deferred.
- **Balancer/Curve:** weighted/stable math; separate adapters. Deferred.

Adding a DEX later = a new `DexAdapter` impl + registry support for its pools. Strategies
and PnL do not change.

## Why v2-style first

Closed-form, cheap, well-understood quoting; the long-tail WETH/base pairs we target live
predominantly in v2-style pools; and it's the simplest correct thing that produces a real
edge signal. Everything else is added only when v2 shadow data says it's worth it.
