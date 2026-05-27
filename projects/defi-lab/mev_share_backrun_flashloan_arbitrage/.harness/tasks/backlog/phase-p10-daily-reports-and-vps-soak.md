# P10 — Daily reports and VPS soak

## Goal

Daily cross-chain comparison report (per chain/DEX/pair survival after 75% bribe capture, risk flag impact, etc.) scheduled from Postgres aggregates. Worker packaged for VPS + systemd + Docker Compose; survives ≥72h unattended soak.

## Acceptance

- [ ] Daily report binary/script or internal scheduler produces human-readable output with the key survival numbers
- [ ] Report numbers match direct SQL aggregates
- [ ] `docs/16-vps-deployment.md` runbook exists and a human (or agent) can bring the worker up on a fresh VPS
- [ ] 72h+ soak on VPS with no crashes, leaks, or silent stalls; metrics and logs remain healthy

## Owner

Rust Core + Observability
