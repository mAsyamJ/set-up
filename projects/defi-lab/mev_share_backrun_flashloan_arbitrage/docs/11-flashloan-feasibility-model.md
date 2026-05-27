# 11 — Flashloan Feasibility Model

**Tier: BUILD NOW (model only). Live flashloan execution: DO NOT BUILD YET.**

Flashloans are a **funding primitive, not a source of edge.** They remove the capital
constraint (which was never the binding one) but add a fee and a feasibility constraint.
In V1 they exist purely as math inside the PnL accountant and a feasibility check — there
is **no executor contract and nothing is borrowed.**

## What the model computes

For a candidate backrun that would need borrowed capital `L` of token `T`:

1. **Lender selection (priority order):**
   - **Balancer V2 Vault** — **0% fee** by governance choice. First choice when `T` has
     sufficient Vault liquidity.
   - **Aave V3 `flashLoanSimple`** — **0.05% (5 bps)** fee. Second choice when Balancer
     lacks `T` or depth.
   - **Aave V3 `flashLoan` (multi-asset)** — later, for multi-token needs.
   - **Uniswap v4 flash accounting is NOT an external flashloan** — it's same-tx delta
     settlement; out of scope for this model in V1.
   - **No flashloan** — if the backrun is small enough to self-fund (future live mode) or
     if no lender is viable, model the route without leverage.

2. **Fee in native terms:**
   `flashloan_fee_native = L_in_native * fee_bps / 10_000`
   (Balancer → 0; Aave simple → 5 bps).

3. **Feasibility flags (no execution):**
   - `lender_available`: does a chosen lender plausibly have `≥ L` of `T`? (modeled from a
     known-liquidity table / periodic read; conservative if unknown.)
   - `fee_kills_edge`: does the fee flip net PnL negative? If so, mark and prefer a
     cheaper lender or the no-flashloan path.

## How it enters PnL

`flashloan_fee_native` is one subtracted term in the net-PnL formula (`12`). A candidate's
recorded PnL is computed under the **cheapest feasible** lender, and the chosen lender +
fee are stored on the candidate so reports can show how often Balancer-0% vs Aave-5bps was
assumed and how much the fee mattered.

## Lender-choice logic (decision)

```
if balancer_has_liquidity(T, L):        use Balancer (0%)
elif aave_has_liquidity(T, L):          use Aave simple (5 bps)
else:                                   no_flashloan (model unleveraged; flag if infeasible)
```

## Why live flashloan is deferred

- It requires a **deployed executor contract** (atomic borrow→swap→repay with strict
  guards), a **live bundle sender**, and real funds for gas — all forbidden in V1.
- The edge question ("does a net-positive opportunity exist after bribe?") is answerable
  *without* borrowing anything: the fee is just a number we subtract. Deferring execution
  costs us nothing in the shadow phase and removes all contract/funds risk.

## Guard requirements (for the FUTURE executor — documented, not built)

When the executor is eventually built (Product-4-style, after shadow evidence):
- Callable only by the bot wallet; allowlisted tokens and routers only.
- Enforce `min_profit`; **revert if final balance < expected**.
- Emergency pause; no unbounded approvals; reentrancy guards.
- Balancer first, Aave second; never trust external calldata.

These are recorded here so the model's outputs map cleanly to a future executor, but
**none of this is implemented in V1.**
