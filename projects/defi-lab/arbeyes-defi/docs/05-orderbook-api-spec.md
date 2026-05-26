# 05 — Orderbook API Spec

> Field names and presence MUST be confirmed against `cowprotocol/services`
> `crates/orderbook/openapi.yml` at a **pinned tag** before coding. Treat everything
> below as the verified-as-of-research shape, not gospel.

## Base URLs (per chain)

| Chain | Production | Staging (barn) |
|-------|-----------|----------------|
| Ethereum mainnet | `https://api.cow.fi/mainnet` | `https://barn.api.cow.fi/mainnet` |
| Gnosis Chain | `https://api.cow.fi/xdai` | `https://barn.api.cow.fi/xdai` |
| Arbitrum One | `https://api.cow.fi/arbitrum_one` | `https://barn.api.cow.fi/arbitrum_one` |
| Base | `https://api.cow.fi/base` | `https://barn.api.cow.fi/base` |

(Also Polygon, BNB, Avalanche, Sepolia, Linea, Ink, Lens, Plasma.) Start with
**mainnet** for the widest, most-contested data, and optionally add **arbitrum_one**
(where solvers start in production).

## Endpoints the engine uses

### `GET /api/v1/auction` — current auction
Returns the live auction the autopilot is running.

```jsonc
{
  "id": 123456,
  "block": 19000000,
  "orders": [ /* AuctionOrder[] */ ],
  "prices": { "0xToken": "1000000000000000000" },   // native-denominated, 1e18 = 1:1
  "surplusCapturingJitOrderOwners": ["0x..."]
}
```

**Caveat:** the openapi marks this **"currently permissioned. Reach out in discord if
you need access."** See *Fallback* below.

### `GET /api/v1/solver_competition/{auction_id}` and `/latest` — ground truth
The settled competition for an auction. **This is the most important read.**

```jsonc
{
  "auctionId": 123456,
  "auctionStartBlock": 19000000,
  "transactionHashes": ["0x..."],
  "referenceScores": { "0xSolver": "123456789" },
  "auction": { /* CompetitionAuction: orders, prices */ },
  "solutions": [
    {
      "ranking": 1,
      "solverAddress": "0x...",
      "score": "123456789",            // native-denominated BigUint string
      "referenceScore": "120000000",
      "txHash": "0x...",
      "clearingPrices": { "0xToken": "..." },
      "orders": [ { "id": "0xUID", "sellAmount": "...", "buyAmount": "..." } ],
      "isWinner": true,
      "filteredOut": false
    }
  ]
}
```

Note: `callData` / `uninternalizedCallData` are **no longer present** in recent
versions. `/v2/...` variants exist; `/v1/...` are deprecated-but-live — pin whichever the
openapi at your tag documents and prefer `/v2` if available.

### `GET /api/v1/orders/{uid}` — order detail
Full order incl. `status ∈ {presignaturePending, open, fulfilled, cancelled, expired}`,
`executedSellAmount`, `executedBuyAmount`, `executedFee`, `class ∈ {market, limit,
liquidity}`.

### `POST /api/v1/quote` — baseline reference quote
Runs the production price-estimation competition; returns a verified, simulated quote.
Used as route candidate (a) and as a sanity check on our own routing.

```jsonc
// request (minimal)
{ "sellToken":"0x...", "buyToken":"0x...", "from":"0x...",
  "kind":"sell", "sellAmountBeforeFee":"1000000000000000000" }
// response
{ "quote": { /* OrderParameters incl. buyAmount, feeAmount */ },
  "expiration":"...", "id":123, "verified":true }
```

### `GET /api/v1/token/{token}/native_price` — native price cross-check
Independent native-denominated price for a token; cross-checks `Auction.prices`.

## Fields the engine actually needs

- From **auction**: `id`, `block`, `orders[]`, `prices{}` (native-denominated).
- From **each order**: `uid`, `sellToken`, `buyToken`, `sellAmount`, `buyAmount`,
  `validTo`, `kind`, `partiallyFillable`, `class`, `receiver`, `appData`,
  `sellTokenBalance`, `buyTokenBalance`.
- From **solver_competition**: `solutions[].{score, referenceScore, isWinner,
  filteredOut, clearingPrices, orders[].{id, sellAmount, buyAmount}}`, top-level
  `referenceScores{}`, `auction.prices{}`.

## Authentication

Read endpoints used here are public. Order creation/cancellation needs EIP-712 /
EIP-1271 / ethsign / pre-sign signatures — **not used** (we never write). The partner
API (`partners.cow.fi`, `X-API-Key`) is **not required** for read-only shadow operation.

## Rate-limit handling

- Expect HTTP **429**. Implement exponential backoff with jitter (base 500ms, cap ~30s),
  and a per-host concurrency limit (start at 2–4 in-flight).
- Cache token decimals (via `evm::erc20`) so you do not re-fetch per auction.
- Poll the current auction every **~3s** (it changes roughly per block); poll
  `solver_competition/latest` on a slower cadence (e.g. every 10–15s) to pick up
  settlements.

## Fallback if `/api/v1/auction` is permissioned

Detect **401/403** on `/auction` and degrade gracefully:

1. **Primary fallback — post-settlement only:** poll `/api/v1/solver_competition/latest`.
   Each response embeds `auction` (orders + prices). You lose real-time-ness but keep
   *full validation capability* — you can still recompute the winner's score and run the
   whole gate. **The scorer validation gate does not require the live `/auction`
   endpoint at all.**
2. **Real-time fallback (optional):** run `cowprotocol/services` autopilot in
   `--shadow https://api.cow.fi/mainnet` mode and read auctions from it, or request
   shadow-competition access via the "CoW Swap Solvers" Telegram group.

Design `cow_client.rs` so the gate path depends only on `solver_competition`, and the
live-auction path is an enhancement that can be disabled by config.
