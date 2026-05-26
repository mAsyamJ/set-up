# 11 — EBBO & Risk Checks

In shadow mode no funds are at risk, so "risk" here means **data-quality and
candidate-validity** risk — guarding against fake-profitable candidates that would poison
the competitiveness analysis. Plus a shadow approximation of EBBO.

## EBBO (Ethereum Best Bid and Offer)

EBBO is CoW's social-consensus rule (CIP-11) that a solver's executed price must be at
least as good as a documented set of baseline AMM liquidity would have given the user. In
production, violations are detected post-facto and the solver must reimburse.

**In shadow mode** we cannot enforce EBBO (we settle nothing), but we approximate it as a
quality flag on our own candidates:

```
ebbo_ok(candidate) :=
   candidate implied price >= univ2_baseline implied price (within epsilon)
```

- Baseline = the best of `UniV2Direct` / `UniV2TwoHop` quotes for the same order.
- If our chosen candidate is *worse* than this baseline, set `ebbo_violation = true` and
  record it. A high EBBO-violation rate in our own outputs means our routing is weak (we
  are leaving price on the table), which directly explains poor competitiveness.
- Record EBBO violations as a metric; they are diagnostic, not disqualifying, in shadow.

## Candidate-validity / risk checks (0–100 score)

Each candidate gets a `risk_score ∈ [0,100]` from weighted sub-checks. Higher = worse.

| Sub-check | What it catches | Weight |
|-----------|-----------------|--------|
| quote reliability | quote `ok=false`, revert, or stale | 30 |
| route complexity | 2-hop adds execution uncertainty vs direct | 10 |
| token safety | sell/buy token on denylist (FoT/rebasing/known-weird) | 25 |
| liquidity depth | quoted `amount_out` implies tiny pool / huge price impact | 15 |
| gas uncertainty | constant gas far from plausible (sanity only) | 5 |
| data freshness | auction/quote older than freshness window | 15 |

```rust
pub fn assess(candidate: &RouteCandidate, ctx: &RiskContext) -> RiskAssessment {
    // sum weighted flags -> score; map to decision band
}
```

### Decision bands

| Band | risk_score | Shadow decision |
|------|-----------|-----------------|
| good | 0–25 | `SCORE` (use in comparison) |
| watch | 26–50 | `SCORE` but flag in report |
| weak | 51–75 | `WEAK_SHADOW` (exclude from headline win-rate; keep in raw) |
| reject | 76–100 | `REJECT` (do not score; log reason) |

> **No live-execution decision exists in Product 1.** The bands stop at "use it in the
> shadow comparison or not." There is no `EXECUTE`.

## Token safety (denylist-first)

For the 14-day window, maintain a small **denylist** of token types we refuse to model:

- Fee-on-transfer tokens (executed amounts won't match naive math).
- Rebasing tokens.
- Tokens with non-standard `decimals` / known honeypot behavior.

Detection is cheap and conservative: a static denylist plus a runtime check that
`erc20_decimals` succeeded and is sane (≤ 36). Anything suspicious → `unsupported_token`
upstream (in the normalizer) or high token-safety risk here. We do **not** attempt
on-chain transfer-simulation in Product 1.

## Stale-data checks

- The auction's `block` / timestamp must be within a freshness window (e.g. ≤ 3 blocks
  old) when we generate candidates in live mode. In FallbackCompetitionOnly mode we are
  grading *settled* auctions, so freshness applies to the quote calls, not the auction.
- Quotes older than ~12s are re-fetched before being used in a comparison.

## Invalid-candidate rejection

A candidate is rejected (not scored) if: quote `ok=false`; `amount_out == 0`; token
denylisted; or `risk_score ≥ 76`. Rejections are logged with reason and counted
(`cow_not_competitive_count` is reserved for *scored-but-lost*; rejections get their own
counter so the two are not conflated).

## Output

```rust
pub struct RiskAssessment {
    pub risk_score: u8,
    pub band: RiskBand,       // Good | Watch | Weak | Reject
    pub ebbo_violation: bool,
    pub flags: Vec<String>,   // human-readable reasons
}
```

## Tests

- A reverting v2 quote → quote-reliability flag → reject band.
- A denylisted token → token-safety flag dominates → reject.
- A candidate worse than v2 baseline → `ebbo_violation = true`.
- A clean direct fill → good band, no flags.
