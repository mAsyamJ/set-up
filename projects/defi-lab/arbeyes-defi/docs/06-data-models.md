# 06 — Data Models

All API amounts are decimal **strings** of base-unit integers (token atoms) or
native-denominated `BigUint`. Never parse them into `f64`. Use `alloy_primitives::U256`
(or `ruint::Uint`) and do fixed-point math. Convert to a display float only at the
reporting boundary.

## Conventions

- `#[serde(rename_all = "camelCase")]` on every API-facing struct (the API is camelCase).
- Amounts as `U256` via a `serde_with` helper that (de)serializes decimal strings.
- Addresses as `alloy_primitives::Address`.
- Token decimals resolved lazily through `evm::erc20` and cached in `core::tokens`.

```rust
// shared (de)serialization helper for "12345" <-> U256
mod u256_str {
    use alloy_primitives::U256;
    use serde::{Deserialize, Deserializer, Serializer};
    pub fn serialize<S: Serializer>(v: &U256, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&v.to_string())
    }
    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<U256, D::Error> {
        let s = String::deserialize(d)?;
        s.parse::<U256>().map_err(serde::de::Error::custom)
    }
}
```

## API-facing structs (mirror the pinned openapi.yml)

```rust
use alloy_primitives::{Address, U256, B256};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuctionSnapshot {
    pub id: u64,
    pub block: u64,
    pub orders: Vec<CowOrder>,
    /// token -> native-denominated price (1e18 == 1:1 with native token)
    #[serde(with = "u256_map_str")]
    pub prices: HashMap<Address, U256>,
    #[serde(default)]
    pub surplus_capturing_jit_order_owners: Vec<Address>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CowOrder {
    pub uid: String,                 // 56-byte order UID (hex)
    pub sell_token: Address,
    pub buy_token: Address,
    pub receiver: Option<Address>,   // null => owner receives
    #[serde(with = "u256_str")] pub sell_amount: U256,
    #[serde(with = "u256_str")] pub buy_amount: U256,
    pub valid_to: u32,               // unix seconds
    pub app_data: B256,
    #[serde(with = "u256_str")] pub fee_amount: U256, // typically 0; solver computes fee
    pub kind: OrderKind,             // Sell | Buy
    pub partially_fillable: bool,
    pub sell_token_balance: SellTokenSource, // Erc20 | External | Internal
    pub buy_token_balance: BuyTokenDestination, // Erc20 | Internal
    pub class: OrderClass,           // Market | Limit | Liquidity
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrderKind { Sell, Buy }

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrderClass { Market, Limit, Liquidity }

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SellTokenSource { Erc20, External, Internal }

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BuyTokenDestination { Erc20, Internal }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolverCompetition {
    pub auction_id: u64,
    pub auction_start_block: u64,
    #[serde(default)] pub transaction_hashes: Vec<B256>,
    #[serde(with = "u256_map_str", default)]
    pub reference_scores: HashMap<Address, U256>,
    pub auction: CompetitionAuction,
    pub solutions: Vec<SolverSettlement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompetitionAuction {
    #[serde(default)] pub orders: Vec<String>, // order uids in scope
    #[serde(with = "u256_map_str")] pub prices: HashMap<Address, U256>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolverSettlement {
    pub ranking: Option<u32>,
    pub solver_address: Address,
    #[serde(with = "u256_str")] pub score: U256,            // native-denominated
    #[serde(with = "u256_str_opt", default)] pub reference_score: Option<U256>,
    pub tx_hash: Option<B256>,
    #[serde(with = "u256_map_str", default)] pub clearing_prices: HashMap<Address, U256>,
    #[serde(default)] pub orders: Vec<ExecutedOrder>,
    pub is_winner: bool,
    #[serde(default)] pub filtered_out: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutedOrder {
    pub id: String, // order uid
    #[serde(with = "u256_str")] pub sell_amount: U256,
    #[serde(with = "u256_str")] pub buy_amount: U256,
}
```

(`u256_map_str` and `u256_str_opt` are trivial variants of the helper above.)

## Internal (engine) structs

```rust
#[derive(Debug, Clone)]
pub struct TokenInfo {
    pub address: Address,
    pub decimals: u8,
    pub symbol: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NormalizedOrder {
    pub uid: String,
    pub sell: TokenInfo,
    pub buy: TokenInfo,
    pub sell_amount: U256,
    pub buy_amount: U256,
    pub kind: OrderKind,
    pub partially_fillable: bool,
    pub class: OrderClass,
    pub valid_to: u32,
    pub limit_price: f64,   // buy_amount/sell_amount, decimals-adjusted, for logging only
    pub supported: bool,    // false => skip (unsupported token/class)
    pub skip_reason: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Venue { CowQuote, UniV2Direct, UniV2TwoHop }

#[derive(Debug, Clone)]
pub struct RouteLeg {
    pub venue: Venue,
    pub token_in: Address,
    pub token_out: Address,
    pub amount_in: U256,
    pub amount_out: U256,
}

#[derive(Debug, Clone)]
pub struct RouteCandidate {
    pub order_uid: String,
    pub venue: Venue,
    pub legs: Vec<RouteLeg>,
    pub amount_in: U256,
    pub amount_out: U256,
    pub gas_estimate: u64,
}

#[derive(Debug, Clone)]
pub struct QuoteResult {
    pub venue: Venue,
    pub amount_out: U256,
    pub gas_estimate: u64,
    pub ok: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ScoringInput {
    pub order: NormalizedOrder,
    pub executed_sell: U256,
    pub executed_buy: U256,
    pub protocol_fee_native: U256,
    pub buy_token_native_price: U256, // from Auction.prices
}

#[derive(Debug, Clone)]
pub struct ScoringResult {
    pub order_uid: String,
    pub surplus_native: U256,
    pub fee_native: U256,
    pub score_native: U256,
    pub kind: OrderKind,
}

#[derive(Debug, Clone)]
pub struct WinnerScoreValidation {
    pub auction_id: u64,
    pub api_winner_score: U256,
    pub recomputed_winner_score: U256,
    pub abs_rel_error: f64,   // |recomputed - api| / api
    pub within_tolerance: bool, // abs_rel_error <= 0.01
    pub notes: Option<String>,
}

#[derive(Debug, Clone)]
pub enum Competitiveness { Competitive, Marginal, NotCompetitive }

#[derive(Debug, Clone)]
pub struct AuctionComparison {
    pub auction_id: u64,
    pub my_total_score: U256,
    pub winner_score: U256,
    pub gap_ratio: f64,       // (winner - mine)/winner ; negative if we beat winner
    pub tag: Competitiveness,
}

#[derive(Debug, Clone)]
pub struct DailyRollup {
    pub date: String,         // YYYY-MM-DD UTC
    pub auctions_seen: u64,
    pub gate_attempts: u64,
    pub gate_passed: u64,
    pub competitive: u64,
    pub marginal: u64,
    pub not_competitive: u64,
    pub p50_gap_ratio: f64,
    pub p95_gap_ratio: f64,
}
```

## BigUint / U256 and decimals — rules

1. **API amounts stay `U256`** end-to-end. No float until reporting.
2. **Scores are native-denominated `U256`.** `Auction.prices[token]` is the
   native-denominated price with `1e18` meaning 1:1. To value an amount of `token` in
   native units: `value_native = amount * price / 1e18` (use `U256` mul-then-div, never
   div-then-mul, to preserve precision).
3. **Decimals** only matter for human-readable `limit_price` and reports; the score math
   works in atoms × native-price and does not need decimal scaling beyond what
   `Auction.prices` already encodes. Cross-check this against the docs when implementing
   the scorer (see `09`).
4. **Rounding:** the 1% gate tolerance absorbs integer-division rounding. Log exact
   `U256` values and the computed `abs_rel_error`.
