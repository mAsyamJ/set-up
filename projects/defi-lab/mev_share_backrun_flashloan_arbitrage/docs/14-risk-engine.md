# 14 — Risk Engine

**Tier: BUILD NOW.** Deterministic, rule-based, and **authoritative**: the risk engine
can downgrade or reject a candidate, and **ML can never override it** (see `18`). In V1 it
gates the *shadow tag*; in a future live mode the same gates block execution.

## Hard rule

> Risk checks are deterministic. ML may rank and filter candidates that already pass risk;
> ML may never promote a candidate that risk rejected.

## Checks (each yields a flag + severity 0–100)

| Check | Catches | V1? | Action |
|-------|---------|-----|--------|
| fee-on-transfer token | math mismatch (received ≠ sent) | NOW | reject |
| rebasing token | balance drift | NOW | reject |
| honeypot / non-standard transfer | unsellable output | NOW | reject |
| blacklist / pausable token | frozen mid-route | NOW | reject |
| proxy upgrade risk | semantics change under you | NOW (flag) | downgrade |
| low liquidity pool | huge price impact / unrealizable size | NOW | downgrade/reject by threshold |
| stale state | reserves older than freshness window | NOW | downgrade (block live LATER) |
| high gas volatility | bribe/gas estimate unreliable | NOW (flag) | downgrade |
| suspicious hook behavior (v4) | MEV-internalizing hook takes the spread | LATER | reject |
| v4 custom accounting | non-standard settlement | LATER | reject |
| L2 sequencer risk | ordering/Timeboost/Flashblocks effects | LATER (flag) | downgrade |
| bad simulation confidence | fast-estimate likely wrong | NOW | downgrade |
| overfit historical pattern | replay-only "edge" | LATER | downgrade |

## Token safety (BUILD NOW, denylist-first)

- Maintain a per-chain **denylist** of fee-on-transfer / rebasing / known-bad tokens in
  `tokens.risk_flags`.
- Cheap runtime checks: `decimals()` resolves and is sane (≤ 36); token not on denylist;
  (optionally) a conservative transfer-behavior probe in a future replay phase.
- Anything suspicious → high token-safety severity → reject. We do **not** attempt
  on-chain transfer simulation in V1.

## Liquidity & freshness (BUILD NOW)

- **Low liquidity:** if the route's size implies price impact beyond a threshold on
  either venue, downgrade; beyond a hard cap, reject. Long-tail pools are thin by nature —
  this guard is essential to avoid fantasy fills.
- **Stale state:** if cached/last-read reserves are older than the freshness window, the
  candidate is downgraded and flagged; a future live path would **block** on stale state.

## Output

```rust
pub struct RiskAssessment {
    pub flags: Vec<RiskFlag>,      // {flag, severity}
    pub max_severity: u8,
    pub decision: RiskDecision,    // Pass | Downgrade | Reject
}
```

Decision mapping: any `Reject`-class flag → `Reject`; else if any high-severity flag →
`Downgrade`; else `Pass`. Persist all flags to `risk_flags` for analysis (which flags kill
the most candidates per chain/pair is itself a useful finding).

## Interaction with PnL and shadow tag

- `Reject` → candidate tagged `reject` regardless of PnL.
- `Downgrade` → candidate keeps its PnL but cannot be tagged `competitive` (capped at
  `marginal`) and is excluded from the headline survival counts.
- `Pass` → eligible for `competitive` if it also `survives_75`.

## Why deterministic-first

In a domain where a single bad token can turn a "profitable" route into a total loss,
safety must be rule-based, auditable, and impossible for a statistical model to talk you
out of. ML's job is to make the *passing* set smaller and better-ranked — never to expand
it past the safety gates.
