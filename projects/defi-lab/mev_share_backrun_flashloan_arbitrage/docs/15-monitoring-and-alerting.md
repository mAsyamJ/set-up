# 15 — Monitoring & Alerting

**Tier: BUILD NOW** for metrics endpoint + tracing + Telegram. Grafana dashboards: BUILD
LATER (Prometheus scrape + `curl` suffices for V1).

## Logging

- `tracing` everywhere; JSON lines on the VPS → journald. Structured fields:
  `chain_id`, `event_kind`, `pool`, `strategy_id`, `net_native`, `survives_75`,
  `latency_ms`. No string-interpolated data you'll want to query.
- Dev (WSL2): pretty/colored via `RUST_LOG`.

## Metrics (Prometheus, localhost `127.0.0.1:9100/metrics`)

```
# ingest
collector_events_total{chain}
collector_reconnects{chain}
collector_rpc_errors{chain}
collector_block_lag{chain}
collector_idle_seconds{chain}
events_dropped_backpressure_total

# pipeline
normalized_events_total{chain,kind}
candidates_total{chain,strategy}
sim_fast_estimate_total
quotes_success_total / quotes_failed_total

# pnl / shadow outcome
shadow_competitive_total{chain,strategy}
shadow_marginal_total{chain,strategy}
shadow_not_competitive_total{chain,strategy}
shadow_reject_total{chain,strategy}
daily_survives_75_total{chain,strategy}

# infra
db_write_lag_ms
db_errors_total
cache_hit_ratio
rpc_errors_total
worker_rss_bytes

# latency histograms (derive p50/p95/p99)
hotpath_event_to_candidate_ms
quote_latency_ms
db_batch_write_ms
```

## Latency budget (hot path, shadow)

| Step | Target | Notes |
|------|--------|-------|
| SSE/log receive → NormalizedEvent | < 10 ms | parsing + map |
| pool lookup | < 1 ms | in-memory cache (Postgres on miss, off hot path) |
| state read | < 1 ms cache / 50–150 ms RPC | RPC only on miss/staleness |
| candidate generation | < 5 ms | closed-form v2 |
| fast-estimate sim | < 1 ms | closed-form |
| PnL estimate | < 5 ms | integer math |
| risk assessment | < 2 ms | rule checks |
| DB write | non-blocking | batched async; must never block ingest |

Rules: **event ingestion never blocks** on downstream work; state reads hit cache first;
RPC is the only thing allowed to be slow, and it's off the critical detection path
wherever possible. In shadow mode, accurate simulation is skipped entirely (it's a LATER
mode), which is what keeps the hot path sub-20ms.

## Health endpoint (axum, BUILD NOW)

`GET /health` → 200 only if: every enabled collector produced an event within its
threshold (or is intentionally idle), the DB pool answers a trivial query, and
`db_write_lag_ms` is under a cap. Otherwise 503 with which subsystem is degraded.

## Telegram alerts (BUILD NOW)

Fire (rate-limited, ≤1/min/category) on:
- collector down / `collector_idle_seconds` over threshold
- RPC error spike (`collector_rpc_errors` rate)
- DB errors / write-lag over cap / disk pressure
- backpressure drops climbing (`events_dropped_backpressure_total`)
- worker restart (systemd) — startup ping
- a notable shadow result (e.g. a candidate that `survives_90` — rare, worth eyeballing)
- (LATER) prediction-error spike, model drift, live revert, negative live PnL

Implementation: a `reqwest` POST to the Telegram bot API; no extra crate.

## Dashboards (BUILD LATER)

Grafana over Prometheus once there's enough data to watch trends: ingest rates, candidate
volume, per-chain survival-after-75% over time, cache hit ratio, RPC/DB health, latency
percentiles. Not needed to start.

## Resource monitoring

`worker_rss_bytes` gauge from `/proc/self/statm`; systemd `MemoryMax` caps the worker so
the logger can't starve the box. If RSS approaches the cap, investigate before adding any
LATER component.
