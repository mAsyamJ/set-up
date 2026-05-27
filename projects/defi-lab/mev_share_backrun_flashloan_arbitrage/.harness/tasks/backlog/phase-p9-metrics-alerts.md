# P9 — Metrics, health, Telegram alerts

## Goal

Prometheus exporter (localhost), axum `/health` + `/metrics`, JSON tracing to journald, Telegram alerts for collector lag, error storms, and backpressure. All key counters/histograms from `docs/15-monitoring-and-alerting.md`.

## Acceptance

- [ ] `/metrics` exposes collector lag, throughput, risk distributions, DB batch stats, alert counters
- [ ] Alerts fire on sustained disconnects or error-rate thresholds via Telegram
- [ ] Tracing JSON is machine-readable and flows to journald under systemd
- [ ] No secrets or tokens in alert configuration examples

## Owner

Observability
