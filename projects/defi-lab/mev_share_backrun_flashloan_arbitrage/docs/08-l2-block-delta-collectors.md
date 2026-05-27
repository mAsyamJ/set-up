# 08 — L2 Block-Delta Collectors (Base, Arbitrum)

**Tier: BUILD NOW (Base, Arbitrum, shadow only).** BNB/Polygon/Optimism: BUILD LATER.

L2s have **no MEV-Share**. Instead of a private hint stream, we observe **public,
post-inclusion** state: new blocks, DEX swap logs, and pool reserve deltas for registered
v2-style pools. This is weaker signal than a private hint (the swap already landed) but is
exactly right for *studying where mispricing windows appear* and whether a backrun would
have been profitable — the V1 goal.

## What these collectors produce

- `NormalizedEvent { kind: SwapObserved }` — decoded from a v2 swap log.
- `NormalizedEvent { kind: ReserveChanged }` — from diffing consecutive `pool_snapshots`.

## Implementation (BUILD NOW)

```rust
pub struct BlockDeltaCollector {
    chain: ChainId,
    provider: EvmProvider,   // alloy, public/paid RPC
    registry: PoolRegistryHandle,
    poll_interval: Duration, // ~ block time of the chain
}

#[async_trait::async_trait]
impl Collector for BlockDeltaCollector {
    fn chain(&self) -> ChainId { self.chain }
    fn kind(&self) -> CollectorKind { CollectorKind::BlockDelta }

    async fn run(&self, tx: mpsc::Sender<NormalizedEvent>, shutdown: CancellationToken)
        -> anyhow::Result<()>
    {
        let mut last = self.provider.block_number().await?;
        loop {
            tokio::select! {
                _ = shutdown.cancelled() => break,
                _ = tokio::time::sleep(self.poll_interval) => {
                    let head = self.provider.block_number().await?;
                    for bn in (last+1)..=head {
                        self.process_block(bn, &tx).await?;
                    }
                    last = head;
                }
            }
        }
        Ok(())
    }
}
```

`process_block(bn)`:
1. `eth_getLogs` for the registered pools' swap/sync topics in block `bn`.
2. Persist `raw_events` (source `block_delta`).
3. For each swap log → `SwapObserved` event (pool, tokens, amount_in).
4. Read post-block reserves for affected pools; write `pool_snapshots`; if reserves moved
   beyond a threshold vs the prior snapshot, also emit `ReserveChanged`.
5. Push normalized events with backpressure.

## RPC discipline (cheap infra)

- Use a **public/paid RPC** (no self-hosted node in V1). Batch `eth_getLogs` by block
  range where the provider allows; respect rate limits with backoff.
- Cache the latest reserves per pool in-memory so detection doesn't re-read on every
  event.
- Poll interval ≈ chain block time (Base/Arbitrum are sub-second to ~2s; don't hammer —
  poll on a sane cadence and catch up ranges).
- Tag each collector's RPC errors (`collector_rpc_errors{chain=...}`); sustained errors →
  alert + that chain degrades (others keep running).

## Why L2 shadow-only in V1

L2 ordering (Arbitrum Timeboost, Base Flashblocks) makes *live* backrunning a latency/
auction game we explicitly do **not** enter in V1. Observing public deltas to *measure*
opportunity is cheap and risk-free and tells us whether an L2 deserves a future live path.

## Adding BNB/Polygon/Optimism later (BUILD LATER)

Same `BlockDeltaCollector`, different chain config + pool registry + RPC. Adding a chain =
adding a config entry + seeding its v2-style pools; no core change. Keep them shadow-only
until evidence says otherwise.

## Metrics & alerts
- `collector_events_total{chain}`, `collector_rpc_errors{chain}`,
  `collector_block_lag{chain}` (head − last processed).
- Alert if `collector_block_lag` grows unbounded (collector falling behind) or RPC errors
  spike.
