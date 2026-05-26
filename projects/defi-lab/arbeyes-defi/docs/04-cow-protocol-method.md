# 04 — CoW Protocol Method

## The intent / batch-auction model

CoW Protocol does not match trades on a continuous AMM curve the way Uniswap does.
Users sign **intents** (orders): "sell at most X of token A for at least Y of token B,
valid until T." These orders are collected off-chain and settled in **batches**.
Competing **solvers** propose settlements; the protocol picks the settlement that
maximizes total surplus (subject to fairness rules), and that single settlement
transaction executes all its trades atomically against a uniform clearing price.

Two consequences matter for us:

- A solver's job is **matching + routing**, not capital provision. You find the best way
  to fill a batch of orders (coincidences-of-wants between users, plus AMM liquidity for
  the remainder), and you express it as clearing prices + interactions.
- Because settlement is batch-level with a uniform clearing price per token, the
  **score** is computed over the whole solution, and the competition is decided by
  comparing solutions — which is exactly the public signal we exploit for shadow grading.

## The three components

```
        orders                          /solve                  /settle
 users ───────▶ ORDERBOOK ──(DB)──▶ AUTOPILOT ──────▶ DRIVER(s) ──────▶ chain
                  (API)               (per chain)        │  ▲
                                                         ▼  │ solution
                                                   SOLVER ENGINE
```

- **Orderbook** — the public-facing service + API + Postgres. Accepts signed orders,
  serves them, and exposes auctions and settled solver competitions. **This is the only
  component we talk to**, and only its read endpoints.

- **Autopilot** — one per chain. "Cuts" an auction: pulls solvable orders from the DB,
  attaches native token prices, filters unsettleable orders, sends `/solve` to every
  registered driver, collects scored solutions, applies fairness filtering, selects the
  winner, and calls `/settle` on the winner. We do not run this in production, but its
  **`--shadow <api-url>`** mode is the supported way to consume production auctions
  locally without being whitelisted.

- **Driver** — a plug-and-play layer between autopilot and a solver engine. Augments the
  auction (token decimals, balance checks, AMM liquidity indexing), forwards to the
  engine, picks the best of multiple returned solutions, simulates on the latest block,
  scores, and (if it wins) submits on-chain. Rust, in `cowprotocol/services`.

- **Solver Engine** — pure matching logic. Receives an augmented auction, returns one or
  more solutions (trades + interactions + clearing prices) via the HTTP interface in
  `crates/solvers/openapi.yml`. Language-agnostic. The reference Rust engine ships a
  `Baseline` mode (greedy single-path output maximization over a base-token graph).

For the shadow solver we **emulate the solver engine's matching/scoring offline** and
compare to the published winner. We do not run autopilot or driver in production; we
optionally use autopilot `--shadow` purely as a data source.

## The batch lifecycle (timing)

1. Autopilot triggers a new auction on order events, on each new block, or every ~2s if
   no block arrived.
2. It sends `/solve` to all drivers in parallel.
3. **Solve deadline ≈ 15s by default** (`solve_deadline` in autopilot config). Solvers
   may return multiple solutions; the driver forwards the best.
4. Autopilot collects scores, applies CIP-67 fair-combinatorial filtering, selects the
   winner(s), calls `/settle`.
5. The winning driver builds and submits the settlement tx within a block deadline.
6. Shortly after, the settled **solver competition** for that auction becomes available
   via the API — this is our ground truth.

For shadow purposes: we read the current auction, do our offline work without any 15s
pressure (we are not competing), then read the settled competition ~30–60s later to
grade ourselves.

## What is public vs. gated

| Data / action | Public? | Notes |
|---------------|---------|-------|
| Current auction (`/api/v1/auction`) | Partly | Marked "currently permissioned" in openapi; fallbacks exist (see `05`). |
| Settled solver competition (`/api/v1/solver_competition/{id}`, `/latest`) | Yes | Our primary ground truth. |
| Orders (`/api/v1/orders/{uid}`) | Yes | Status, executed amounts. |
| Quote (`POST /api/v1/quote`) | Yes | Baseline reference quote. |
| Native price (`/api/v1/token/{t}/native_price`) | Yes | Useful cross-check on `Auction.prices`. |
| Submitting a solution | **Gated** | Requires onboarding/bond. Out of scope. |
| Shadow competition (no settlement) | Available without bond | Via Telegram-mediated whitelist or autopilot `--shadow`. Optional. |

## Shadow / local testing flow (official)

CoW documents a shadow competition where "the solver is tested using production order
flow but without settling any orders" — explicitly for integration testing, available on
Arbitrum and mainnet, requested via the "CoW Swap Solvers" Telegram group. Separately,
the autopilot binary supports `--shadow https://api.cow.fi/mainnet` to consume
production auctions for local shadowing.

Our engine does not *need* either: polling `/api/v1/solver_competition/latest` (public)
plus `/api/v1/auction` (with fallback) is sufficient for the 14-day validation. The
official shadow mode is a bonus path if we want real-time auction input without relying
on the permissioned `/auction` endpoint.
