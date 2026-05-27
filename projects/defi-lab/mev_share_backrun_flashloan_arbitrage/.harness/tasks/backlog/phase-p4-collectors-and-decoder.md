# P4 — Ethereum MEV-Share and L2 block-delta collectors

## Goal

`Collector` trait + concrete impls: MEV-Share SSE (with reconnect, dedup, historical hint backfill) for Ethereum; block-delta + swap/reserve scanners for Base and Arbitrum. `decoder` enriches raw observations into `NormalizedEvent`. Events flow into Postgres and the internal channel.

## Acceptance

- [ ] Collectors run as long-lived async tasks, survive reconnect storms, and back-pressure gracefully (raw always persisted)
- [ ] First real or backfilled MEV-Share hints and L2 block-delta events appear as `NormalizedEvent` rows
- [ ] Decoder handles partial-info hints and public swap/reserve events uniformly
- [ ] Worker can be pointed at ENABLED_CHAINS=ethereum,base,arbitrum and ingest for minutes without crash

## Owner

Rust Core + Rust EVM
