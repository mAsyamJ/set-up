# 13 — Live Monitoring Spec

Production-grade observability on a $10–$30 VPS: structured logs to journald, a localhost
Prometheus endpoint, a health endpoint, optional Telegram alerts, and a systemd restart
policy. No alertmanager, no managed observability, no log shipping.

## Logging (tracing)

- `tracing` everywhere; init in `core::telemetry`.
- **Local/WSL2 dev:** pretty, colored, `RUST_LOG`-controlled.
- **VPS:** **JSON** lines to stdout → captured by journald.
- Structured fields, never string-interpolated data: `auction_id`, `order_uid`,
  `venue`, `abs_rel_error`, `gap_ratio`, `latency_ms`. This makes `journalctl` + `jq`
  queries possible.

```rust
// core::telemetry
pub fn init(json: bool, env_filter: &str) {
    let filter = EnvFilter::try_new(env_filter).unwrap_or_else(|_| EnvFilter::new("info"));
    let sub = tracing_subscriber::registry().with(filter);
    if json { sub.with(fmt::layer().json()).init(); }
    else    { sub.with(fmt::layer().pretty()).init(); }
}
```

## Metrics (Prometheus, localhost only)

- `metrics` + `metrics-exporter-prometheus`, exposed by `axum` on
  `METRICS_BIND_ADDR` (default `127.0.0.1:9100`), path `/metrics`.
- Bound to localhost — no public exposure. Scrape locally or `curl` on demand. A full
  Prometheus server is optional; for 14 days `curl 127.0.0.1:9100/metrics` is enough.

### Required metrics

```
# counters
cow_auctions_seen
cow_competitions_seen
cow_orders_seen
cow_score_validation_attempts
cow_score_validation_passed
cow_score_validation_failed
cow_routes_generated
cow_quotes_success
cow_quotes_failed
cow_competitive_shadow_count
cow_marginal_shadow_count
cow_not_competitive_count
cow_api_errors
cow_rpc_errors
cow_db_errors

# histograms (then derive p50/p95)
cow_processing_ms          # per-auction end-to-end
cow_quote_latency_ms       # per quote call
```

Expose `cow_processing_ms_p50` / `_p95` either via histogram quantiles in Prometheus or
by computing rolling percentiles in `metrics.rs` and publishing as gauges (simpler for a
no-Prometheus-server setup).

## Health endpoint (axum)

- `GET /health` → `200 {"status":"ok","last_auction_age_s":N,"db":"ok"}`.
- "Healthy" means: last successful competition fetch within a threshold (e.g. 60s) **and**
  the DB pool responds to a trivial query. Used by the systemd watchdog and any uptime
  pinger.

```rust
async fn health(State(s): State<AppState>) -> impl IntoResponse {
    let age = s.last_fetch_age_s();
    let db_ok = s.db_ping().await.is_ok();
    let ok = age < 60 && db_ok;
    let code = if ok { StatusCode::OK } else { StatusCode::SERVICE_UNAVAILABLE };
    (code, Json(json!({ "status": if ok {"ok"} else {"degraded"},
                        "last_auction_age_s": age, "db": if db_ok {"ok"} else {"err"} })))
}
```

## Alerts (optional, Telegram)

- If `ALERT_WEBHOOK_URL` (or a Telegram bot token + chat id) is configured, send a
  message on: process start/stop, gate-pass milestone (e.g. "100 auctions validated,
  87% within 1%"), sustained API error rate, or a notable shadow win (`gap_ratio < 0`,
  i.e. we beat the winner).
- Implementation: a `reqwest` POST. No crate beyond `reqwest`. Rate-limit alerts (no more
  than 1 per minute per category) to avoid spam.

## systemd restart policy

`Restart=always`, `RestartSec=5`, a `WatchdogSec` if you wire `sd_notify`, and resource
caps so the logger can never starve the box:

```ini
MemoryMax=512M
CPUQuota=80%
```

(Full unit file in `14`.)

## Resource monitoring

- The process self-reports RSS via a periodic gauge (`cow_rss_bytes`) using a small
  `/proc/self/statm` read on Linux.
- `systemctl status` + `journalctl -u cow-shadow -f` are the day-to-day tools.
- If RSS approaches `MemoryMax`, that is the signal to investigate a leak before adding
  any second product to the box.

## Failure modes the monitoring must surface

| Failure | Signal |
|---------|--------|
| `/auction` permissioned | log once at INFO + a `cow_api_errors` bump; engine continues in fallback |
| RPC provider down | `cow_rpc_errors` rising; quotes fail; health stays ok if competition fetch works |
| CoW API down | `last_auction_age_s` climbs; `/health` → degraded; alert fires |
| DB locked / disk full | `cow_db_errors` > 0; `/health` db != ok; alert fires |
| Scorer regressions | `cow_score_validation_failed` rising vs passed; visible in daily report |
