# 12 — PnL Accounting

**Tier: BUILD NOW.** The honest net-of-bribe accountant is the core of the whole product.
A scanner that logs *gross* profit is a self-deception machine; the bribe is the strategy.

All math in `U256` native-token units; convert to human values only for reports.

## The formula

```
net_pnl =
    gross_profit
  - gas_cost
  - priority_fee_or_bribe
  - flashloan_fee
  - dex_fees
  - slippage
  - failed_attempt_cost
  - safety_buffer
```

Term by term (native-denominated):

- **gross_profit** — output of the backrun route minus input, valued in the native token
  via current prices (closed-form v2 quote).
- **gas_cost** — `gas_used_estimate * gas_price`. `gas_used` from `DexAdapter::gas_hint`
  per hop + base overhead; `gas_price` from a chain gas oracle (cached).
- **priority_fee_or_bribe** — the dominant term. Modeled as a **fraction of gross**
  (see bribe-survival below). This is what you'd pay the builder/validator to land.
- **flashloan_fee** — from the feasibility model (`11`): Balancer 0% or Aave 5 bps on the
  borrowed notional; 0 if unleveraged.
- **dex_fees** — already inside the v2 quote (0.30% per hop) — ensure not double-counted;
  if the quote is net-of-fee, this term is 0 and the fee is implicit in gross.
- **slippage** — modeled buffer for state movement between observation and (hypothetical)
  inclusion; larger for partial-info (blind) candidates.
- **failed_attempt_cost** — expected wasted gas from reverts/lost auctions (a modeled
  expectation in shadow; informs whether a strategy is viable net of misses).
- **safety_buffer** — conservative margin; larger for partial_info events and exotic
  tokens.

## Bribe-survival tests (the graduation gate)

Because the bribe is the killer and we can't know the winning bid in shadow, we test the
candidate's net PnL under three bribe-capture assumptions and record all three:

```
survives_50 = (gross*(1-0.50) - other_costs) > 0
survives_75 = (gross*(1-0.75) - other_costs) > 0
survives_90 = (gross*(1-0.90) - other_costs) > 0
```

A candidate **graduates** (is tagged `competitive`) only if it **survives the 75%
assumption**. `marginal` = survives 50% but not 75%. `not_competitive` = doesn't survive
50%. `reject` = risk engine blocked it regardless.

> The 75% bribe-survival check is the entire experiment. If a candidate can't beat it in
> shadow with no funds at risk, it can't beat real competitors who do this full-time. Do
> not quietly drop or lower this assumption to make the log look profitable.

## Implementation sketch

```rust
pub struct PnlInputs {
    pub gross_native: U256,
    pub gas_native: U256,
    pub flashloan_fee_native: U256,
    pub dex_fee_native: U256,        // 0 if implicit in gross
    pub slippage_native: U256,
    pub failed_attempt_native: U256,
    pub safety_buffer_native: U256,
    pub partial_info: bool,
}

pub fn estimate(p: &PnlInputs) -> PnlEstimate {
    let other = p.gas_native + p.flashloan_fee_native + p.dex_fee_native
              + p.slippage_native + p.failed_attempt_native + p.safety_buffer_native;
    let survives = |cap: u32| {
        let kept = p.gross_native * U256::from(100 - cap) / U256::from(100);
        kept > other
    };
    let bribe = p.gross_native * U256::from(75) / U256::from(100); // record at the gate cap
    let net = p.gross_native.saturating_sub(bribe + other);
    PnlEstimate {
        net_native: net,
        survives_50: survives(50), survives_75: survives(75), survives_90: survives(90),
        // ... store all component terms ...
    }
}
```

Store every component term in `pnl_estimates` (not just the net) so analysis can see
*which* cost dominates per chain/pair — that's how you learn where edge could exist.

## Partial-info handling

For `partial_info` (blind ETH hints), inflate `slippage_native` and `safety_buffer_native`
and flag the row. Reports compare partial-info vs full-info survival rates so you learn
whether blind backrunning is worth pursuing.

## What "profitable in shadow" must mean

A row counts toward the edge signal only if `survives_75 == true` **and** the risk engine
did not reject it **and** (later) it survives accurate replay. Anything less is logged but
excluded from the headline survival counts.
