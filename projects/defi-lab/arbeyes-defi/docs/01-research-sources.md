# 01 — Research Sources

All implementation-affecting facts below were verified against primary sources. Each
entry lists what it is used for, a confidence level, and whether it must be re-checked
before coding (APIs and CIPs drift).

## Primary sources

| # | Source | Used for | Confidence | Recheck before coding? |
|---|--------|----------|-----------|------------------------|
| 1 | CoW docs — *Joining the Solver Competition* (`docs.cow.fi/cow-protocol/tutorials/solvers/onboard`) | Onboarding gate, shadow competition existence, KYC, Arbitrum-first | High | Yes — bond sizes & fees change via CIP |
| 2 | CoW docs — *Solver competition rules* (`.../reference/core/auctions/competition-rules`) | Fair Combinatorial Auction (CIP-67), reference bids, filtering | High | Yes |
| 3 | CoW docs — *What is solving* (`.../reference/core/auctions/the-problem`) | Exact per-order score formula (sell/buy), surplus, π | High | Yes |
| 4 | CoW docs — *Rewards* (`.../reference/core/auctions/rewards`) | Reward formula, caps (β, c_l, c_u) per chain | High | Yes |
| 5 | CoW docs — *Bonding pools* (`.../reference/core/auctions/bonding-pools`) | $500K + 1.5M COW full pool; reduced pool (CIP-44) | High | Yes — token price moves USD-equiv |
| 6 | CoW docs — *API Integration* (`docs.cow.fi/cow-protocol/integrate/api`) | Base URLs per chain | High | Yes |
| 7 | `cowprotocol/services` `crates/orderbook/openapi.yml` (pin a tag, e.g. `v2.320.0`) | Exact endpoint paths, JSON field names, `Auction`, `SolverCompetitionResponse`, `SolverSettlement`, `Order` | High | **Yes — pin a commit/tag** |
| 8 | `cowprotocol/services` `crates/solvers/openapi.yml` | `/solve` solution shape (trades, interactions, prices) — reference only | High | Yes |
| 9 | CoW docs — *Autopilot / Driver / Solver Engine* (`.../tutorials/arbitrate/*`) | Component roles, batch lifecycle, solve deadline, `--shadow` mode | High | Medium |
| 10 | CoW docs — *Local solver testing* (`.../tutorials/solvers/local_test`) | Local shadow/test flow | High | Medium |
| 11 | CoW docs — *GPv2Settlement* (`.../reference/contracts/core/settlement`) | `GPv2Order.Data` struct, settlement contract address, domain separator | High | Low (contract is stable) |
| 12 | Paradigm — *Introducing Alloy v1.0* (May 2025) | alloy as the EVM crate; ethers-rs deprecation | High | Low |
| 13 | `gakonst/ethers-rs` issue #2667 | ethers-rs officially deprecated → use alloy | High | Low |
| 14 | Uniswap v3 docs — `QuoterV2` / v2 Router `getAmountsOut` | RPC quoting for route generation | High | Low |

## CIPs that define current scoring (verify each is still in force)

- **CIP-38** — Solver Computed Fees & Rank by Surplus. Defines fees moving into the
  solver's responsibility and ranking by surplus; defines the UDCP constraint.
- **CIP-65** — refinements to the score / fee treatment (verify exact wording).
- **CIP-67** — Fair Combinatorial Auction (reference bids, per-pair filtering, winner
  selection). This is the rule that makes "would I have won?" only partially
  reproducible from public data.
- **CIP-44** — reduced bonding pool.
- **CIP-48** — 15% service fee on weekly rewards.

> CIPs supersede docs when they conflict. Before implementing the scorer, read the
> latest CIPs on `forum.cow.fi` and confirm none have changed the formula since this
> pack was written.

## Stale-source warning

- **`cowprotocol/solver-template-py` is explicitly marked outdated** in its own README
  ("does not currently function as a basis for implementing a solver"). Do **not** start
  from it.
- Older blog posts and SDK examples reference `callData` / `uninternalizedCallData` on
  `SolverSettlement`. Those fields were **removed** in recent openapi versions. Trust the
  pinned openapi.yml, not blog posts.
- A flat "0.012 ETH reward cap" appears in old write-ups. The current cap is
  `c_u = β × protocol-fee` (variable) with `c_l` chain-specific (0.010 ETH on
  Ethereum/Arbitrum/Base). Use the rewards doc, not legacy numbers.

## Endpoints/values that MUST be re-checked immediately before coding

1. The exact set of fields on `Auction`, `SolverCompetitionResponse`, `SolverSettlement`
   in the openapi.yml at the tag you pin.
2. Whether `GET /api/v1/auction` is still marked "currently permissioned."
3. The current per-order score formula wording (CIP drift).
4. The current bonding-pool numbers and COW spot price (capital-decision input only;
   irrelevant to the 14-day shadow build).
