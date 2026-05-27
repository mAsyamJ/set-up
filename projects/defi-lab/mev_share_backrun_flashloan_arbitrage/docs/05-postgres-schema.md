# 05 — PostgreSQL Schema

Postgres is the **source of truth**. Caches are rebuildable; Postgres is durable. All
token amounts and prices are stored as `NUMERIC(78,0)` (fits `U256` exactly) — never
float. Human-readable money values use `NUMERIC(38,18)` only at the reporting boundary.
Raw payloads go in `JSONB`.

Migrations live in `migrations/` (sqlx). Tag each table BUILD NOW / LATER.

## Tables

### `chains` — BUILD NOW
```sql
CREATE TABLE chains (
  chain_id        BIGINT PRIMARY KEY,        -- 1, 8453, 42161, ...
  name            TEXT NOT NULL,
  native_symbol   TEXT NOT NULL,
  collector_kind  TEXT NOT NULL,             -- 'mevshare' | 'block_delta'
  enabled         BOOLEAN NOT NULL DEFAULT true
);
```
Why: registry of scanned chains. Hot? No (config-ish). Retention: permanent.

### `tokens` — BUILD NOW
```sql
CREATE TABLE tokens (
  chain_id     BIGINT NOT NULL REFERENCES chains(chain_id),
  address      BYTEA NOT NULL,
  symbol       TEXT,
  decimals     SMALLINT,
  risk_flags   JSONB NOT NULL DEFAULT '[]',  -- fot/rebasing/honeypot/etc (see risk doc)
  first_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, address)
);
```
Why: token metadata + risk classification. Hot? decimals read often → also cached
in-memory. Retention: permanent.

### `pools` — BUILD NOW
```sql
CREATE TABLE pools (
  id           BIGSERIAL PRIMARY KEY,
  chain_id     BIGINT NOT NULL REFERENCES chains(chain_id),
  address      BYTEA NOT NULL,
  dex          TEXT NOT NULL,                -- 'univ2' | 'sushiv2' | ... (v3/v4/bal/curve LATER)
  token0       BYTEA NOT NULL,
  token1       BYTEA NOT NULL,
  fee_bps      INTEGER,                      -- 30 for v2
  created_block BIGINT,
  UNIQUE (chain_id, address)
);
CREATE INDEX idx_pools_pair ON pools(chain_id, token0, token1);
```
Why: pool registry (V1: v2-style only). Hot? lookups on every event → cached. Retention:
permanent.

### `pool_snapshots` — BUILD NOW
```sql
CREATE TABLE pool_snapshots (
  id           BIGSERIAL PRIMARY KEY,
  pool_id      BIGINT NOT NULL REFERENCES pools(id),
  block_number BIGINT NOT NULL,
  reserve0     NUMERIC(78,0) NOT NULL,
  reserve1     NUMERIC(78,0) NOT NULL,
  observed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snap_pool_block ON pool_snapshots(pool_id, block_number DESC);
```
Why: state history for replay + features. Hot? latest snapshot cached. Retention: 30–90d
hot, then downsample/archive (cold).

### `raw_events` — BUILD NOW
```sql
CREATE TABLE raw_events (
  id           BIGSERIAL PRIMARY KEY,
  chain_id     BIGINT NOT NULL,
  source       TEXT NOT NULL,                -- 'mevshare_sse' | 'block_delta' | 'backfill'
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload      JSONB NOT NULL                -- verbatim collector payload (audit trail)
);
CREATE INDEX idx_raw_chain_time ON raw_events(chain_id, received_at DESC);
```
Why: verbatim audit; lets you re-derive everything offline. Hot? write-heavy, append-only.
Retention: 14–30d hot, archive/drop after (large).

### `normalized_events` — BUILD NOW
```sql
CREATE TABLE normalized_events (
  id            BIGSERIAL PRIMARY KEY,
  raw_event_id  BIGINT REFERENCES raw_events(id),
  chain_id      BIGINT NOT NULL,
  kind          TEXT NOT NULL,               -- 'mevshare_hint'|'swap_observed'|'reserve_changed'
  block_number  BIGINT,
  pool_id       BIGINT REFERENCES pools(id),
  token_in      BYTEA, token_out BYTEA,
  amount_in     NUMERIC(78,0),
  observed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  partial_info  BOOLEAN NOT NULL DEFAULT false  -- true for MEV-Share hints w/ missing fields
);
CREATE INDEX idx_norm_chain_block ON normalized_events(chain_id, block_number DESC);
CREATE INDEX idx_norm_pool ON normalized_events(pool_id);
```
Why: the chain-agnostic event model. Hot? drives detection. Retention: 30–90d.

### `event_impacts` — BUILD NOW
```sql
CREATE TABLE event_impacts (
  id                 BIGSERIAL PRIMARY KEY,
  normalized_event_id BIGINT NOT NULL REFERENCES normalized_events(id),
  pool_id            BIGINT NOT NULL REFERENCES pools(id),
  pre_reserve0       NUMERIC(78,0), pre_reserve1 NUMERIC(78,0),
  est_post_reserve0  NUMERIC(78,0), est_post_reserve1 NUMERIC(78,0),
  price_impact_bps   INTEGER
);
```
Why: estimated post-event imbalance that a backrun would exploit. Retention: with
normalized_events.

### `candidate_opportunities` — BUILD NOW
```sql
CREATE TABLE candidate_opportunities (
  id                 BIGSERIAL PRIMARY KEY,
  normalized_event_id BIGINT NOT NULL REFERENCES normalized_events(id),
  chain_id           BIGINT NOT NULL,
  strategy_id        TEXT NOT NULL,          -- 'backrun_v1'
  pair               TEXT NOT NULL,          -- e.g. 'WETH/PEPE'
  route_json         JSONB NOT NULL,         -- venues + legs
  est_gross_native   NUMERIC(78,0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cand_chain_strat ON candidate_opportunities(chain_id, strategy_id, created_at DESC);
```
Why: detected candidates. Hot? write-heavy. Retention: 90d.

### `simulation_results` — BUILD NOW (fast-estimate) / LATER (fork)
```sql
CREATE TABLE simulation_results (
  id            BIGSERIAL PRIMARY KEY,
  candidate_id  BIGINT NOT NULL REFERENCES candidate_opportunities(id),
  mode          TEXT NOT NULL,               -- 'fast_estimate' (NOW) | 'fork_replay' (LATER)
  success       BOOLEAN NOT NULL,
  amount_out    NUMERIC(78,0),
  gas_used      BIGINT,
  notes         TEXT
);
```

### `pnl_estimates` — BUILD NOW
```sql
CREATE TABLE pnl_estimates (
  candidate_id        BIGINT PRIMARY KEY REFERENCES candidate_opportunities(id),
  gross_native        NUMERIC(78,0) NOT NULL,
  gas_native          NUMERIC(78,0) NOT NULL,
  bribe_native        NUMERIC(78,0) NOT NULL,  -- assumed
  flashloan_fee_native NUMERIC(78,0) NOT NULL,
  dex_fee_native      NUMERIC(78,0) NOT NULL,
  slippage_native     NUMERIC(78,0) NOT NULL,
  safety_buffer_native NUMERIC(78,0) NOT NULL,
  net_native          NUMERIC(78,0) NOT NULL,
  survives_50         BOOLEAN NOT NULL,
  survives_75         BOOLEAN NOT NULL,
  survives_90         BOOLEAN NOT NULL,
  shadow_decision     TEXT NOT NULL            -- 'competitive'|'marginal'|'not_competitive'|'reject'
);
```
Why: the honest net-of-bribe verdict — the core output. Hot? read by reports. Retention:
permanent (this is the evidence).

### `bundle_attempts` / `landed_transactions` — DO NOT BUILD YET (schema reserved)
Defined in a LATER migration when live execution is in scope. Not created in V1.

### `strategy_runs` — BUILD NOW
```sql
CREATE TABLE strategy_runs (
  id           BIGSERIAL PRIMARY KEY,
  strategy_id  TEXT NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL,
  ended_at     TIMESTAMPTZ,
  events_seen  BIGINT, candidates BIGINT, version TEXT
);
```

### `ml_features` — BUILD NOW (collect) / model LATER
```sql
CREATE TABLE ml_features (
  candidate_id   BIGINT PRIMARY KEY REFERENCES candidate_opportunities(id),
  features       JSONB NOT NULL,             -- structured feature vector
  label_realized NUMERIC(78,0),              -- filled later by replay/post-land (LATER)
  label_ready    BOOLEAN NOT NULL DEFAULT false
);
```
Why: accumulate ML-ready rows from day one; train **later**. No model reads this in V1.

### `ml_predictions` — DO NOT BUILD YET (reserved)
Created when a model exists.

### `daily_rollups` — BUILD NOW
```sql
CREATE TABLE daily_rollups (
  date         DATE NOT NULL,
  chain_id     BIGINT NOT NULL,
  strategy_id  TEXT NOT NULL,
  candidates   BIGINT NOT NULL,
  survives_75  BIGINT NOT NULL,
  median_net_native NUMERIC(78,0),
  p95_net_native    NUMERIC(78,0),
  PRIMARY KEY (date, chain_id, strategy_id)
);
```

### `risk_flags` — BUILD NOW
```sql
CREATE TABLE risk_flags (
  id            BIGSERIAL PRIMARY KEY,
  candidate_id  BIGINT REFERENCES candidate_opportunities(id),
  flag          TEXT NOT NULL,               -- 'fot_token'|'low_liq'|'stale_state'|...
  severity      SMALLINT NOT NULL,           -- 0..100
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Hot path vs cold path

- **Hot (read on every event):** `pools`, `tokens.decimals`, latest `pool_snapshots` —
  all also cached in-memory.
- **Write-heavy (append, async batched):** `raw_events`, `normalized_events`,
  `candidate_opportunities`, `pnl_estimates`, `ml_features`.
- **Cold (reports/analysis):** `daily_rollups`, historical snapshots, `ml_features`
  labels.

## Write discipline

- Collectors write `raw_events` first (durability), then push normalized events downstream.
- Downstream persistence per candidate (`candidate` + `sim` + `pnl` + `ml_features` +
  `risk_flags`) wrapped in **one transaction**.
- Use a **batched async writer** (channel → buffer → `COPY`/multi-row insert) so DB writes
  never block event ingestion. On DB error, increment `db_errors` and retry with backoff;
  never crash the collector.

## Retention / housekeeping (BUILD LATER as a cron)
- `raw_events`: 14–30d then archive/drop.
- snapshots/normalized/candidates: 90d hot, downsample after.
- `pnl_estimates`, `ml_features`, `daily_rollups`: keep (the dataset).
