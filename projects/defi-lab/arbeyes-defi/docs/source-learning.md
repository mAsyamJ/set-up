# Source-Code Learning Guide (`cowprotocol/services`)

Study the official Rust code to get the semantics right; **do not vendor or copy large
chunks**. The goal is a small, owned codebase whose correctness is proven by the gate,
not a fork of a production system.

## What to study and why

| Area in `cowprotocol/services` | Study it for | Copy? |
|--------------------------------|--------------|-------|
| `crates/orderbook/openapi.yml` | Exact endpoint paths, JSON field names, enums (`OrderKind`, `OrderClass`, balance sources). **Pin a tag.** | Mirror the *shapes* into your `models.rs`; don't copy code. |
| `crates/solvers/openapi.yml` | The `/solve` solution shape (trades, interactions, clearing prices) — to understand what a real solution looks like. | Reference only; you don't build a `/solve` server in P1. |
| `crates/solvers` `Baseline` engine | How a minimal matching engine maximizes single-path output over a base-token graph — informs your UniV2 direct/2-hop routing. | Learn the algorithm; write your own small version. |
| `autopilot` | How auctions are cut, prices attached, solve deadline, winner selection — confirms the lifecycle in `04`. | Don't run/copy; read for understanding. |
| `driver` | How solutions are simulated/scored/picked; how scores map to the API — confirms your scorer's inputs. | Read the scoring path closely; reimplement minimally. |
| domain separator / `GPv2Settlement` | Settlement contract address + EIP-712 domain (for completeness; not needed since we don't sign). | Reference only. |

## Concepts worth copying (ideas, not code)

- **Native-denominated scoring**: every score is in the chain's native token via
  `Auction.prices`. Internalize the 1e18 convention.
- **Uniform clearing prices (UDCP)** and the CIP-38 constraint relating clearing prices
  to surplus/fees — drives both EBBO and the scorer.
- **Base-token graph routing** (route through WETH/USDC) — the seed of your 2-hop venue.
- **Bounded concurrency + retry** patterns for hitting RPC/API politely.

## What NOT to copy

- The whole driver/autopilot/orderbook services — far more than P1 needs, and a
  maintenance burden.
- Database layer / Postgres schemas — we use a tiny SQLite schema of our own (`12`).
- Any submission/settlement code — out of scope; we never write on-chain.
- Liquidity-indexing subsystems — overkill; UniV2 `getAmountsOut` suffices first.

## Why the implementation must stay small

The deliverable is *evidence*, produced by code you fully understand. A small codebase:
- makes the gate meaningful (you can explain every number),
- runs on a $10–$30 VPS,
- is honest about scope (no half-ported production subsystems rotting in the repo),
- transfers cleanly to Product 2 via the three shared crates.

If you find yourself porting more than a few hundred lines from `services`, stop — you've
left "shadow validation" and drifted toward "run a solver," which is the gated,
capital-heavy thing P1 exists to *decide whether to pursue*.
