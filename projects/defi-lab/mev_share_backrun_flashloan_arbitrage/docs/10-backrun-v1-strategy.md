# 10 — Strategy V1: Long-Tail Blind v2-Style Backrun / Mispricing

**Tier: BUILD NOW.** The one and only V1 strategy plugin (`strategy_backrun_v1`,
`StrategyFamily::Backrun`). Shadow only — `build_execution` returns a shadow plan, never
sent.

## Thesis

A user swap moves a v2-style pool away from the wider market price. A **backrun** trades
the pool back toward equilibrium against an alternate venue for the same pair, capturing
the imbalance. We target **long-tail WETH/base-token pairs** because they're the least
contested tier where a solo scanner can plausibly find net-of-bribe edge.

## Inputs (`required_inputs`)

```
MEV-Share hint (ETH) OR SwapObserved/ReserveChanged (L2)
known pool registry (the touched pool + alternate venues for the pair)
state snapshot (reserves of touched pool and alternate venues)
gas estimate (chain-specific)
flashloan fee model (feasibility only)
risk flags (token safety, liquidity, staleness)
```

## Flow

```
event (hint or swap)
  → resolve touched pool + pair (registry)
  → estimate post-user imbalance (event_impacts)
        ETH partial hint  → blind: assume a swap occurred; size conservatively
        L2 SwapObserved   → exact-ish: use observed amount_in
  → find alternate venues for the same pair (registry.by_pair)
  → for each alt venue: compute the backrun route that profits from the imbalance
        (buy cheap venue / sell dear venue), sizing via v2 quote_in/quote_out
  → fast-estimate amount_out for the route (DexAdapter, closed-form)
  → PnL accountant: net = gross - gas - bribe - flashloan_fee - dex_fees - slippage - buffer
  → risk engine: deterministic flags (block if reject)
  → store candidate + sim + pnl + ml_features + risk_flags (one tx)
  → shadow decision tag (competitive / marginal / not_competitive / reject)
```

## Detection detail

- **Imbalance sizing (blind, ETH partial hints):** without the exact user amount, assume a
  range of plausible swap sizes (e.g. quantiles of recent swaps on that pool from
  `pool_snapshots`/history) and compute the backrun that is profitable across the
  *conservative* end of the range. Record the assumption; PnL adds a larger safety buffer
  for partial-info candidates.
- **Imbalance sizing (L2 observed):** use the actual `amount_in` from the swap log. More
  precise; still shadow.
- **Route construction (v2-only, first pass):** single-pair, two-venue backrun
  (touched pool ↔ one alternate v2 pool). Multi-hop/cyclic is **BUILD LATER**.
- **Sizing the backrun:** choose `amount_in` that maximizes net PnL given both venues'
  reserves (closed-form optimum for two constant-product pools; or a small numeric search
  over a few sizes). Cap by available liquidity and a max-notional guard.

## Why these "why nots" (locked decisions)

- **Why not stablecoin same-chain arb first:** thinnest margins, most contested, pennies
  after bribe. Bad PnL signal.
- **Why not blue-chip ETH/USDC first:** owned by integrated searcher-builders; you lose
  the bribe auction structurally.
- **Why not v4-only first:** immature off-chain quoting + hook MEV-internalization risk;
  unjustified complexity pre-evidence.
- **Why long-tail WETH/base first:** lowest competition, simplest correct v2 math, best
  chance of a real surviving margin.

## Output: `ScoredOpportunity`

Carries the route, gross/net native, the three bribe-survival booleans (50/75/90%), risk
flags, and the shadow decision. Persisted; never executed.

## How multi-hop / more strategies plug in later (BUILD LATER)

- `cyclic-arb`: A→B→C→A across ≥3 pools — new plugin, reuses registry/adapters/PnL.
- `lending-arb`: liquidation + swap — new plugin + lending adapters.
- `blind-backrun` variants: statistical sizing models — new plugin.
- `v4-hook-aware`: after a v4 adapter + hook classifier exist.

None of these touch `backrun-v1` or the core; they're added as crates under
`crates/strategies/` and registered via config.

## V1 boundary

`build_execution` returns a **shadow** `ExecutionPlan` (route description + sized amounts +
predicted net) used only for logging and the later replay phase. It produces **no
sendable calldata**. The live bundle sender and flashloan executor are DO NOT BUILD YET.
