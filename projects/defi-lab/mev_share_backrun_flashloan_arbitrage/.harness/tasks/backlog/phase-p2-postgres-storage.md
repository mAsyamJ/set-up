# P2 — Postgres, migrations, storage writer

## Goal

Docker Compose Postgres + sqlx migrations + `storage` crate (PgPool, migrate on startup, batched async writer that never blocks collectors) operational.

## Acceptance

- [ ] `infra/docker-compose.yml` brings up Postgres with WAL and the project DB
- [ ] `migrations/` contain the initial schema from `docs/05-postgres-schema.md` (raw_events, normalized_events, candidate_opportunities, pnl_estimates, ml_features, pool_registry, etc.)
- [ ] `storage` crate connects, runs migrations, and supports high-volume batched inserts with backpressure semantics
- [ ] Worker skeleton can persist a synthetic `NormalizedEvent` and read it back

## Owner

Rust Core
