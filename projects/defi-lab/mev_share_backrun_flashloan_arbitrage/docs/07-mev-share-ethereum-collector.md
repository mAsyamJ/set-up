# 07 — MEV-Share Ethereum Collector

**Tier: BUILD NOW.** The Ethereum collector. The only chain with a private-orderflow hint
stream in V1.

## What MEV-Share gives you

- An **SSE event stream** of pending-transaction *hints* over `mev-share.flashbots.net`.
  Each hint reveals only what the originating user/searcher permits: possibly the tx
  hash, possibly logs, possibly the function selector, possibly the touched contract
  address. Often **partial**.
- The economic point: users route through MEV-Share to get a **refund** of most of the
  MEV their transaction creates; searchers compete to *backrun* these hints, and the
  surplus is shared back. For our shadow scanner, the hints are a high-signal feed of
  "something just happened that may have left a pool mispriced."

## The partial-information problem

You frequently do **not** get exact amounts. You might learn only "a swap touched the
WETH/PEPE Uniswap v2 pool." This is why **blind backrunning** exists: you reason about the
*likely* post-swap imbalance and construct a backrun that profits across a range of
possible user-swap sizes, sized conservatively.

In V1 (shadow), this is ideal: we log what we *would* have done and, in a later replay
phase, check against what actually happened on-chain after the hint.

## Bundle submission (conceptual only — DO NOT BUILD YET)

A real searcher would assemble a bundle `[userTx (referenced by hint), yourBackrunTx]`
and submit via `mev_sendBundle` to a relay/builder, bidding priority fee. **V1 builds none
of this.** We model the bribe in PnL and stop. The live bundle sender is a LATER/forbidden
component.

## Collector implementation (BUILD NOW)

```rust
pub struct MevShareCollector {
    url: String,          // SSE endpoint
    http: reqwest::Client,
}

#[async_trait::async_trait]
impl Collector for MevShareCollector {
    fn chain(&self) -> ChainId { ChainId::ETHEREUM }
    fn kind(&self) -> CollectorKind { CollectorKind::MevShareSse }

    async fn run(&self, tx: mpsc::Sender<NormalizedEvent>, shutdown: CancellationToken)
        -> anyhow::Result<()>
    {
        loop {
            tokio::select! {
                _ = shutdown.cancelled() => break,
                res = self.stream_once(&tx) => {
                    if let Err(e) = res {
                        tracing::warn!(?e, "mev-share stream dropped; reconnecting");
                        metrics::counter!("collector_reconnects", "chain" => "ethereum").increment(1);
                        backoff_sleep().await;
                    }
                }
            }
        }
        Ok(())
    }
}
```

`stream_once`:
- Opens the SSE stream with `reqwest` + `eventsource-stream`.
- For each event: persist verbatim to `raw_events` (source `mevshare_sse`), then map to
  `NormalizedEvent { kind: MevShareHint, partial_info: <missing fields?> }`, then
  `tx.send(...)` with bounded backpressure (if the channel is full, the raw row is still
  persisted; increment a drop counter — never block the stream).
- Heartbeat/idle detection: if no event for N seconds, log + metric (the stream can go
  quiet; that's not necessarily an error, but prolonged silence triggers an alert).

## Historical hint backfill (BUILD NOW)

A one-shot/periodic task that pulls historical hints (and/or historical Uniswap v2 swaps
on Ethereum) to seed `raw_events`/`normalized_events` so analysis isn't gated on live
accumulation. Source: MEV-Share history endpoint if available, else historical swap logs
via RPC `eth_getLogs` over a block range. Mark `source = 'backfill'`.

## Reliability requirements

- **Reconnect with backoff + jitter** on stream drop; never crash the worker.
- **Dedup** recent events (hash/id) using an in-memory LRU to avoid double-processing on
  reconnect overlap.
- **Metrics:** `collector_events_total{chain="ethereum"}`,
  `collector_reconnects{chain="ethereum"}`, `mevshare_partial_info_ratio`,
  `collector_idle_seconds{chain="ethereum"}`.
- **Alert:** if `collector_idle_seconds` exceeds a threshold (stream silently dead), fire
  Telegram.

## Ethereum-only — restated

This collector is **Ethereum-specific**. Base/Arbitrum/etc. do **not** have an equivalent
private hint stream and use block-delta collectors (`08`). Do not attempt to point this
collector at an L2.
