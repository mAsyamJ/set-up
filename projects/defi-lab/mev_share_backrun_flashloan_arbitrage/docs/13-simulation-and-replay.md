# 13 — Simulation & Replay

Two modes, phased. V1 ships the cheap one and a clean interface for the accurate one.

## Modes

| Mode | Tier | What it does |
|------|------|--------------|
| **Fast-estimate** | **BUILD NOW** | Closed-form v2 math (no EVM). Microseconds. Used to grade every candidate in shadow. |
| **Fork/replay (accurate)** | **BUILD LATER** | revm/reth (preferred) or Anvil fork; executes the route against real state at a block. Validates the estimate before any live work. |
| **Historical replay** | **BUILD LATER** | Re-run detection over historical hints/swaps to backfill labels and measure predicted-vs-realized. |
| **Post-land verification** | **BUILD LATER** | After a hint, read what actually happened on-chain; compare to prediction. |
| **Live canary** | **DO NOT BUILD YET** | Tiny real execution on one chain+strategy, only after metrics pass. |

## V1: fast-estimate + replay placeholder

- **Fast-estimate (NOW):** given the route and cached/last-read reserves, compute
  `amount_out` via the v2 closed form; produce `simulation_results { mode:'fast_estimate'
  }`. This is what feeds PnL in shadow.
- **Replay placeholder (NOW):** define the `Simulator` trait so the accurate engine drops
  in later without touching strategies/PnL:

```rust
#[async_trait::async_trait]
pub trait Simulator: Send + Sync {
    async fn simulate(&self, plan: &ExecutionPlan, at_block: u64)
        -> anyhow::Result<SimOutcome>; // amount_out, gas_used, success, revert_reason
}

pub struct FastEstimateSim; // NOW: closed-form, ignores at_block beyond state lookup
// pub struct ForkReplaySim;  // LATER: revm/reth or Anvil
```

## Predicted vs realized (the validation that gates live, BUILD LATER)

When fork/replay + post-land verification exist, every prediction is scored against
reality and stored (`ml_features.label_realized`). The go/no-go metrics:

```
median prediction error  <= 10%
p95 prediction error      <= 20%
sim success rate          >= 85%
(live) revert rate        < 5%
```

A strategy may only be promoted toward a live canary when its shadow predictions clear
these bars on accurate replay. Until then, fast-estimate numbers are *directional
evidence*, explicitly labeled as estimates, not ground truth.

## Why fast-estimate is enough for V1

The V1 question is "does any chain/pair show opportunities that survive 75% bribe?" That's
answerable with closed-form v2 math at near-zero cost. Accurate replay matters only once
you've found a candidate-rich niche worth validating precisely — spending revm/reth
engineering before that is premature.

## Honesty rule

Every shadow PnL number in V1 is tagged `mode = fast_estimate`. No report may present a
fast-estimate figure as realized PnL. The fork-replay phase exists precisely to catch
where the closed-form estimate is optimistic (exotic pools, fee-on-transfer slipping
through, multi-block state movement).
