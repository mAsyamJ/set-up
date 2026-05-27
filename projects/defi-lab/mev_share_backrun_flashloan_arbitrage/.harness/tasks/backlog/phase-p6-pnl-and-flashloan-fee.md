# P6 — PnL and flashloan-fee feasibility model

## Goal

`pnl` crate computes honest net = gross − gas − bribe − flashloan_fee − dex_fees − slippage − failed_attempt − safety_buffer. Flashloan is a **fee** number only (Balancer 0% first, Aave ~5bps). Produces `survives_50/75/90` flags and populates `pnl_estimates`.

## Acceptance

- [ ] `pnl_estimates` rows with full decomposition and the three bribe-survival booleans
- [ ] Flashloan fee is treated strictly as a cost in the model; no execution path
- [ ] Unit tests with synthetic opportunities prove the accounting and survival logic

## Owner

Rust Core
