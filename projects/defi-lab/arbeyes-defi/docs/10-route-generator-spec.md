# 10 — `routes.rs` / `quote.rs` Spec

> **GATE:** Do not implement this file until the scorer validation gate (`09`) passes.
> Route generation is meaningless if you cannot trust the score you assign to a route.

Generates simple candidate fills for a normalized order and quotes them, so the engine
can assign each candidate a score and pick the best per order.

## Allowed venues (first pass only)

1. **CoW `/quote` baseline** (`Venue::CowQuote`) — one API call; returns a verified,
   simulated quote. This is the reference: if our own routing cannot beat or match this,
   our routing adds no value.
2. **Uniswap v2 direct** (`Venue::UniV2Direct`) — `sell → buy` via the v2 Router
   `getAmountsOut`. Pure view call, cheap.
3. **Uniswap v2 2-hop** (`Venue::UniV2TwoHop`) — `sell → BASE → buy` where
   `BASE ∈ {WETH, USDC}`. Two `getAmountsOut` legs (or one call with a 3-token path).

**Explicitly NOT in the first pass:** Uniswap v3, Uniswap v4, Balancer, Curve,
multi-hop > 2, split routes. Add only after the v2 + CoW-quote baseline is graded and the
data justifies more complexity.

## Quote adapters (`quote.rs`)

```rust
pub async fn quote_cow(client: &CowClient, order: &NormalizedOrder) -> QuoteResult;
pub async fn quote_univ2_direct(evm: &EvmProvider, order: &NormalizedOrder) -> QuoteResult;
pub async fn quote_univ2_two_hop(evm: &EvmProvider, order: &NormalizedOrder, base: Address) -> QuoteResult;
```

- `quote_cow`: `POST /api/v1/quote` with the order's tokens/amount/kind; map
  `quote.buyAmount` → `amount_out`. Gas estimate: use the quote's fee/gas hints if
  present, else a fixed conservative constant.
- `quote_univ2_direct`: `evm.univ2_get_amounts_out(amount_in, [sell, buy])` →
  `amounts.last()`. Use the canonical v2 Router per chain (mainnet
  `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`). Gas estimate: ~120k constant.
- `quote_univ2_two_hop`: path `[sell, base, buy]`; gas ~180k constant. Skip if any leg
  has no pool (call reverts) — mark `ok=false` with the revert reason.

All quote calls are bounded-concurrency and individually timed (record latency).

## Candidate assembly (`routes.rs`)

```rust
pub async fn generate_candidates(
    order: &NormalizedOrder,
    client: &CowClient,
    evm: &EvmProvider,
) -> Vec<RouteCandidate>;
```

For a **sell** order (fix `sell_amount`, maximize `buy`):
- amount_in = `sell_amount`; produce a candidate per venue with `amount_out` = quoted
  buy. Higher `amount_out` ⇒ more surplus ⇒ higher score.

For a **buy** order (fix `buy_amount`, minimize `sell`):
- first pass: quote the forward direction and **flag buy orders as approximate** (proper
  buy-side routing solves for required input). Record `skip_reason = "buy_routing_approx"`
  on the candidate but still produce a best-effort number so buy orders are not silently
  dropped. Improve only if buy orders turn out to matter in the data.

Pick the **best candidate per order** = the venue maximizing the order's score (compute
score for each candidate via `09`'s `score_order`). Persist all candidates (for analysis)
and mark the chosen one.

## Sanity checks before scoring a candidate

- `amount_out > 0` and the quote `ok`.
- For sell orders: `amount_out ≥ buy_amount` (limit satisfied) — if not, the candidate
  does not fill the order; keep it but mark `fills = false` so it scores as
  non-competitive rather than producing fake surplus.
- EBBO sanity (see `11`): the implied price must be at least as good as the v2 baseline;
  flag violations.

## Gas handling

Gas estimates here are **constants per venue**, not on-chain `estimateGas`. We are not
submitting, and CoW's score formula is surplus/fee-based (fees subsume solver costs per
CIP-38). Gas constants are recorded only for later realism analysis, not for the score.

## Output

`Vec<RouteCandidate>` per order, persisted to `route_candidates`; the chosen best feeds
`compare.rs`. Every candidate row carries `venue`, `amount_in`, `amount_out`,
`gas_estimate`, `ok`, and any flags.

## Tests

- v2 direct quote for a known block/pair returns a plausible amount (integration test,
  env-gated).
- 2-hop path with a missing middle pool is marked `ok=false`.
- Candidate selection picks the higher-surplus venue for a sell order.
- Buy order produces a flagged approximate candidate, not a drop.
