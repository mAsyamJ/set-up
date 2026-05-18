# 09 Database Schema

## aegis_events

```sql
CREATE TABLE IF NOT EXISTS aegis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  chain_id INTEGER NOT NULL,
  method TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT,
  value_wei TEXT,
  value_usd NUMERIC,
  selector TEXT,
  decoded_function TEXT,
  decoded_args JSONB,
  use_case TEXT,
  is_unknown_selector BOOLEAN DEFAULT false,
  policy_id TEXT,
  policy_template TEXT,
  on_chain_policy_hash TEXT,
  verdict TEXT NOT NULL,
  reason_code TEXT,
  signals JSONB,
  needs_ai_analysis BOOLEAN DEFAULT false,
  broadcasted BOOLEAN DEFAULT false,
  tx_hash TEXT,
  ai_memo TEXT,
  ai_unknown_selector_guess TEXT,
  ai_risk_summary TEXT,
  ai_pre_signing_assist TEXT,
  ai_confidence TEXT,
  ai_generated_at TIMESTAMPTZ,
  latency_ms INTEGER
);
```

## aegis_policies

```sql
CREATE TABLE IF NOT EXISTS aegis_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'enforce',
  chain_id INTEGER NOT NULL DEFAULT 84532,
  config JSONB NOT NULL,
  on_chain_policy_id TEXT,
  on_chain_policy_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## adapter_health

```sql
CREATE TABLE IF NOT EXISTS adapter_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adapter_name TEXT NOT NULL,
  status TEXT NOT NULL,
  reason_code TEXT,
  data JSONB,
  checked_at TIMESTAMPTZ DEFAULT now()
);
```
