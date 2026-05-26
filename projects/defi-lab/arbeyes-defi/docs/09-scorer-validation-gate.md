# 09 — Scorer & Validation Gate (the most important file)

This is the heart of Product 1. Before the engine is allowed to generate routes or claim
competitiveness, it must prove it can **reproduce the winning settlement's score from
public data**. If it cannot, the scoring model is misunderstood or not publicly
reproducible, and everything downstream is fiction.

> Re-verify the formula against current CIPs (CIP-38/65/67) and the *What is solving*
> docs before coding. The wording below is the verified-as-of-research version.

## The scoring formula

A solution's score is the sum of the scores of the orders it executes. Per the CoW docs,
for an order `o`:

- **Sell order (and CoW-AMM order):**
  `score(o) = (U(o) + f(o)) · p(b)`
- **Buy order:**
  `score(o) = (U(o) + f(o)) · p(b) · π`

where:

- `U(o)` = **surplus** of the order.
  - Sell order: `U = x − y/π` (you delivered more buy-token than the limit required).
  - Buy order: `U = x·π − y`.
  - Here `x` = executed sell amount, `y` = executed buy amount (atoms), and
    `π` = the order's **limit price** = `limit_buy_amount / limit_sell_amount`.
- `f(o)` = **protocol fee** attributed to the order (per CIP-38, solver-computed).
- `p(b)` = the **native-denominated price of the buy token**, taken from
  `Auction.prices[buy_token]` (1e18 == 1:1 with the native token).
- The whole score is therefore **native-token-denominated** — the same unit as the
  `score` field in `SolverSettlement`.

> Implementation note: do all of this in `U256` with mul-before-div. `π` is a ratio of
> two `U256` limit amounts; avoid computing it as an `f64`. Express `y/π` as
> `y · limit_sell / limit_buy`, and `x·π` as `x · limit_buy / limit_sell`, so the math
> stays integer. Carry an explicit rounding direction and rely on the 1% gate tolerance
> to absorb it.

## Computing the score for a sell order (integer form)

Given executed `x` (sell atoms), executed `y` (buy atoms), limits `Ls` (limit sell),
`Lb` (limit buy), protocol fee in native `f_native`, and buy-token native price `p`:

```
surplus_buy_atoms = x_scaled_to_buy? NO — surplus is in buy-token atoms:
  U_buy = y - (x * Lb / Ls)            // executed buy minus required buy at limit
  // (if U_buy < 0 the solution under-delivered vs limit; clamp/flag)
U_native = U_buy * p / 1e18
score    = U_native + f_native          // f already native; p already applied to U
```

Wait — order of operations matters. The doc form is `(U + f)·p(b)`. So compute surplus
and fee **in buy-token atoms**, sum, then multiply by `p(b)`:

```
U_buy   = y - (x * Lb / Ls)             // buy-token atoms
f_buy   = protocol_fee_in_buy_atoms      // buy-token atoms (CIP-38 solver-computed)
score   = (U_buy + f_buy) * p / 1e18     // native-denominated U256
```

## Computing the score for a buy order (integer form)

Surplus accrues in the **sell** token; the `· π` factor converts it consistently:

```
U_sell  = (x * 0) ...                     // buy order: U = x·π − y in buy-token terms
// Per doc: score(buy) = (U + f) · p(b) · π
// with U = x·π − y  (buy-token denominated once ·π applied)
U_term  = (x * Lb / Ls) - y               // = x·π − y in buy-token atoms
score   = (U_term + f_buy) * p / 1e18     // then the doc's extra ·π is already in U_term framing
```

> The exact placement of `π` for buy orders is the easiest thing to get wrong. **Do not
> trust this pseudocode blindly** — derive it from the live docs and then *prove it
> correct by reproduction* (below). The gate is precisely the mechanism that catches a
> wrong `π` placement: if buy-order scoring is wrong, auctions containing buy orders will
> fail the 1% check and stand out in the failure logs.

## Recomputing the winning settlement's score (the gate procedure)

For each settled auction fetched via `get_solver_competition`:

1. Take the **winning** `SolverSettlement` (`is_winner == true`).
2. For each `ExecutedOrder` in it, fetch the order's limit amounts (`Ls`, `Lb`, `kind`)
   from the embedded `auction` / order data, and the buy-token native price from
   `competition.auction.prices` (NOT the live auction — use the prices the competition
   was scored against).
3. Compute each order's score with the formula above.
4. Sum to `recomputed_winner_score`.
5. Compare to the API's `winning_settlement.score`:
   `abs_rel_error = |recomputed − api| / api`.
6. `within_tolerance = abs_rel_error ≤ 0.01`.
7. Persist a `WinnerScoreValidation` row.

```rust
pub fn recompute_solution_score(
    sol: &SolverSettlement,
    auction: &CompetitionAuction,
    orders: &HashMap<String, NormalizedOrder>, // uid -> normalized (has limits, kind)
) -> U256 {
    let mut total = U256::ZERO;
    for ex in &sol.orders {
        let ord = &orders[&ex.id];
        let p = auction.prices[&ord.buy.address];
        total += score_order(ord, ex.sell_amount, ex.buy_amount, /*fee*/ U256::ZERO, p);
    }
    total
}
```

> **Protocol fee `f`:** the competition response may not break out per-order protocol
> fee directly. If `f` cannot be sourced exactly, start by setting `f = 0` and see how
> close reproduction gets. If a consistent gap appears that tracks fee size, that gap is
> the signal you must source `f` (from executed-fee fields or fee policy in `appData`).
> Document whichever path the data supports.

## Tolerance strategy

- **Primary gate:** `abs_rel_error ≤ 1%` on **≥80% of 100+** settled auctions.
- Track the **distribution** of `abs_rel_error`, not just pass/fail — a tight cluster at
  0.2% with a few outliers is very different from a smear up to 5%.
- Bucket failures by characteristics: contains buy orders? contains partial fills?
  multi-pair batch? unusual tokens? The buckets tell you *what* you modeled wrong.

## What cannot be reproduced publicly

- **CIP-67 fair-combinatorial filtering** needs competitors' per-pair counterfactual
  bids. The API exposes only final solutions + `score`/`referenceScore`/`filteredOut`,
  not the per-bid breakdown. So you **cannot** recompute "would my bid have survived
  filtering / won the combinatorial auction."
- **`referenceScore_i`** (counterfactual auction with solver i removed) and
  **`missingScore_i`** (winning-but-reverted) are not reconstructable for arbitrary
  hypothetical solvers.

Therefore the gate validates **score reproduction of an existing, known settlement** —
which is fully public — and the later comparison (`11`/`compare.rs`) is framed as
**"my score vs the winner's score,"** explicitly not "I would have won."

## Success criteria

- ≥80% of 100+ settled auctions reproduce the winner score within 1%, **and**
- failures are *explained* (a coherent bucket, e.g. "all buy-order batches" → fix `π`),
  not random.

## Failure modes & responses

| Symptom | Likely cause | Response |
|---------|-------------|----------|
| Sell orders pass, buy orders fail | wrong `π` placement | re-derive buy formula from docs |
| Constant ~X% underestimate | missing protocol fee `f` | source `f`; re-run |
| Multi-pair batches fail, single-pair pass | aggregation/price-source bug | verify per-order `p(b)` uses competition prices |
| Everything off by 1e-something | native-price 1e18 scaling | fix mul/div order |
| Random scatter, no pattern | wrong field mapping or stale openapi | re-pin openapi, re-check field names |
| Cannot pass after honest effort | formula not publicly reproducible **or** misunderstood | **invoke kill criterion**; stop before route generation |

## Weaker gate (only if exact reproduction proves impossible)

If, after sourcing fees and fixing `π`, exact reproduction is genuinely impossible from
public data, fall back to a **rank-correlation gate**: compute *relative* scores across
the competing solutions and check that your recomputation **ranks the winner first** on
≥90% of auctions (Spearman/Kendall agreement on ordering). This is weaker — it validates
ordering, not magnitude — and must be loudly labeled as such in every report. Prefer the
1% magnitude gate; use the rank gate only as a documented fallback.
