# 06 — Event Normalization

The whole multi-chain comparison rests on **one** event model. Each collector maps its
chain-specific input into `NormalizedEvent`; everything downstream is chain-agnostic.

## `NormalizedEvent` (BUILD NOW)

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NormalizedEvent {
    pub chain_id: ChainId,
    pub kind: EventKind,
    pub block_number: Option<u64>,
    pub observed_at: chrono::DateTime<chrono::Utc>,
    /// Pool this event touches, if resolvable at decode time.
    pub pool: Option<PoolRef>,
    pub token_in: Option<Address>,
    pub token_out: Option<Address>,
    pub amount_in: Option<U256>,
    /// True when the source gave only partial info (MEV-Share hints often do).
    pub partial_info: bool,
    /// Verbatim source payload id for audit (FK to raw_events).
    pub raw_event_id: Option<i64>,
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum EventKind {
    MevShareHint,   // Ethereum, private orderflow, possibly partial
    SwapObserved,   // L2 public swap log (post-inclusion)
    ReserveChanged, // L2 pool reserve/tick delta
}
```

`PoolRef` is `{ pool_id: Option<i64>, address: Address, dex: Dex }` — `pool_id` is filled
when the pool is in the registry; unknown pools are still recorded (and may trigger
registry discovery).

## Mapping rules per collector

### MEV-Share hint → `NormalizedEvent { kind: MevShareHint, partial_info: maybe }`
- Hints expose **partial** info by the sender's privacy settings: maybe a tx hash, maybe
  logs, maybe function selector, maybe contract address. Map whatever is present.
- If the hint exposes a pool/pair (e.g. a Uniswap swap log), set `pool`/`token_in`/
  `amount_in`; otherwise leave them `None` and set `partial_info = true`. The strategy
  decides whether a partial hint is still actionable (blind backrun — see `10`).

### L2 swap log → `NormalizedEvent { kind: SwapObserved }`
- Decode the DEX swap event for a **registered** v2-style pool → fill pool, tokens,
  `amount_in`, `block_number`. `partial_info = false`.

### L2 reserve change → `NormalizedEvent { kind: ReserveChanged }`
- From block-delta diffing of `pool_snapshots`; fill pool + new reserves (carried in the
  impact estimate, not the event amount fields). Used to detect mispricing windows even
  without a specific swap.

## Decoding pipeline (BUILD NOW)

```
raw payload
  → collector maps to NormalizedEvent (chain-specific)
    → decoder enriches: resolve pool_id via registry; resolve token decimals via cache
      → emit enriched NormalizedEvent on the channel
```

The decoder is **shared**; per-chain quirks stay in the collector. The decoder never does
network I/O on the hot path beyond cached lookups; a registry/decimals miss is resolved
on a side task and the event is processed with what's known (and re-examined if needed).

## Partial-information handling

- `partial_info = true` events are **first-class**, not errors. They are the basis of
  blind backrunning: you know *something* happened to a pool but not the exact amounts.
- The strategy may still produce a candidate from a partial hint using conservative
  assumptions, and the PnL accountant applies a larger safety buffer for partial-info
  candidates (recorded so reports can compare partial vs full).

## Why this matters

Cross-chain comparison — the entire point of V1 — is only possible because a Base swap
log and an Ethereum MEV-Share hint become the *same* downstream object. Strategies,
scoring, storage, and reports all operate on `NormalizedEvent` and never branch on chain
except where genuinely necessary (and that branching is pushed into collectors).
