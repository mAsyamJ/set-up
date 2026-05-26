# 08 — `normalizer.rs` Spec

Converts raw `CowOrder` (API shape) into `NormalizedOrder` (engine shape), resolving
token metadata and deciding whether the engine supports the order at all. A normalized
order is either `supported = true` (proceed to routing/scoring) or carries a
`skip_reason`.

## Responsibilities

1. Resolve `TokenInfo` (decimals, symbol) for `sell_token` and `buy_token` via
   `core::tokens` (cached) → `evm::erc20` on cache miss.
2. Classify the order (`Sell` vs `Buy`) and carry `partially_fillable`, `class`.
3. Compute a human-readable `limit_price` for logging only.
4. Apply support filters; mark unsupported orders with a reason instead of erroring.

## Token decimals & symbol

```rust
async fn token_info(tokens: &TokenRegistry, evm: &EvmProvider, addr: Address)
  -> Result<TokenInfo, NormalizeError>
{
    if let Some(t) = tokens.get(addr) { return Ok(t); }
    let decimals = evm.erc20_decimals(addr).await?;     // eth_call decimals()
    let symbol = evm.erc20_symbol(addr).await.ok();      // best-effort
    let t = TokenInfo { address: addr, decimals, symbol };
    tokens.insert(t.clone());
    Ok(t)
}
```

Decimals are cached for the process lifetime (token decimals do not change). Symbol is
best-effort and never blocks normalization.

## Sell vs buy distinction

- **Sell order:** user fixes `sell_amount` (sell *exactly* this), wants `≥ buy_amount`.
  Surplus accrues in the buy token.
- **Buy order:** user fixes `buy_amount` (buy *exactly* this), willing to pay
  `≤ sell_amount`. Surplus accrues in the sell token.

This distinction drives both the route direction and the score formula (see `09`). Carry
`kind` faithfully; do not normalize buy orders into sell orders.

## Partially fillable orders

- If `partially_fillable == true`, the executed amounts in a settlement may be a fraction
  of the limit amounts. For shadow grading we read the *actual* executed amounts from the
  settled `ExecutedOrder` rather than assuming full fill.
- For our own candidate route generation in the first pass, **treat partially-fillable
  orders as full-fill candidates** (simplest correct-enough approximation) and flag them
  so reports can separate full vs partial behavior. Note this approximation explicitly in
  the candidate record.

## Validity / expiration

- Drop (mark unsupported, reason `expired`) orders whose `valid_to` is already in the
  past relative to the auction's block timestamp / current time. They will not be in a
  fresh auction, but guard anyway.

## Owner / receiver

- `receiver == None` means proceeds go to the owner. We do not move funds, so receiver is
  informational only; carry it through for completeness but it does not affect scoring.

## Support filters (mark unsupported, do not error)

Set `supported = false` with a `skip_reason` for:

| Condition | Reason |
|-----------|--------|
| `class == Liquidity` | `liquidity_order` — these are solver/AMM liquidity, not user intents to grade |
| token decimals unresolved after retry | `unknown_decimals` |
| token on a denylist (fee-on-transfer / rebasing / known weird) | `unsupported_token` |
| `valid_to` in the past | `expired` |
| sell or buy amount is zero | `zero_amount` |
| (first pass) order requires v3/v4/Balancer/Curve-only liquidity to fill sensibly | `no_v2_route` (set later by routing, not here) |

Unsupported orders are still **logged** (so reports can show coverage), just excluded
from routing/scoring.

## Output

```rust
pub async fn normalize(
    raw: &CowOrder,
    tokens: &TokenRegistry,
    evm: &EvmProvider,
    now_unix: u32,
) -> NormalizedOrder; // never errors at the order level; encodes failure as skip_reason
```

A batch helper normalizes all orders in an auction concurrently with bounded
concurrency (reuse the same semaphore discipline as the client) and returns
`Vec<NormalizedOrder>`.

## Tests

- Decimals resolution hits the cache on the second call (assert no second `eth_call`).
- A `Liquidity`-class order is marked unsupported with the right reason.
- A buy order and a sell order both round-trip with correct `kind` and `limit_price`.
- An expired order is filtered.
- Zero-amount order is filtered.
