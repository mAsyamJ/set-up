# 16 — VPS Deployment

**Tier: BUILD NOW.** One cheap VPS, 24/7. Postgres via Docker Compose; the Rust worker via
systemd (or also Compose — see decision). Dev on Windows + WSL2 (identical Ubuntu
userland). No Kubernetes, no archive node, no managed observability.

## Topology decision

- **Postgres:** Docker Compose (easy, reproducible, durable volume).
- **Worker:** **systemd-managed native binary** (lowest overhead, simplest logs via
  journald, `Restart=always`). Running it in Compose is acceptable but systemd is
  preferred for the worker so journald gets structured logs directly.
- **Prometheus/Grafana:** **BUILD LATER**; for V1, the worker exposes `/metrics` on
  localhost and you scrape/`curl` as needed.

## `infra/docker-compose.yml` (Postgres only for V1)

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: searcher
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: searcher
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"     # localhost only
    command: >
      postgres -c shared_buffers=256MB -c max_connections=50
               -c work_mem=8MB -c synchronous_commit=off
volumes:
  pgdata:
```

`synchronous_commit=off` trades a tiny durability window for much higher write throughput
— fine for an append-heavy logger where Postgres is the truth but losing the last few ms
on a crash is acceptable.

## Worker config & env

`config/vps.toml` + env overrides:

```
DATABASE_URL=postgres://searcher:***@127.0.0.1:5432/searcher
ETH_MEVSHARE_SSE_URL=...
ETH_RPC_URL=...           # public/paid
BASE_RPC_URL=...
ARBITRUM_RPC_URL=...
METRICS_BIND_ADDR=127.0.0.1:9100
ALERT_TELEGRAM_BOT_TOKEN=...
ALERT_TELEGRAM_CHAT_ID=...
LOG_JSON=true
LOG_LEVEL=info
ENABLED_CHAINS=ethereum,base,arbitrum
```

Secrets via `EnvironmentFile=/etc/searcher.env` (`chmod 600`), never in the repo.

## systemd unit (`/etc/systemd/system/searcher-worker.service`)

```ini
[Unit]
Description=Rust Multi-Chain Backrun Shadow Searcher
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=searcher
ExecStart=/usr/local/bin/searcher-worker --config /etc/searcher.toml
EnvironmentFile=-/etc/searcher.env
Restart=always
RestartSec=5
MemoryMax=1G
CPUQuota=150%
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/searcher

[Install]
WantedBy=multi-user.target
```

## First-time VPS setup

```bash
sudo apt update && sudo apt install -y build-essential pkg-config libssl-dev git curl docker.io docker-compose-plugin
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh && source "$HOME/.cargo/env"
sudo useradd --system --create-home --shell /usr/sbin/nologin searcher
sudo mkdir -p /var/lib/searcher && sudo chown searcher:searcher /var/lib/searcher
git clone <repo> /opt/rust-searcher-lab && cd /opt/rust-searcher-lab
cp infra/.env.example infra/.env   # set POSTGRES_PASSWORD
docker compose -f infra/docker-compose.yml up -d
cargo build --release && sudo cp target/release/searcher-worker /usr/local/bin/
sudo cp config/vps.toml.example /etc/searcher.toml   # edit
sudo systemctl daemon-reload && sudo systemctl enable --now searcher-worker
journalctl -u searcher-worker -f
```

> On a 1 GB box, release builds with LTO may OOM — add 2 GB swap for the build, or build
> in WSL2/CI and `scp` the binary. Postgres + worker together fit comfortably in 1–2 GB at
> V1 volumes.

## Logs / metrics / backup

- Logs: `journalctl -u searcher-worker -f`; JSON queryable with `jq`.
- Metrics: `curl 127.0.0.1:9100/metrics`.
- Backup: nightly `pg_dump` via a systemd timer to `/var/backups`; keep ~7. Restore =
  `pg_restore` into a fresh DB.

## Migrations

Run on worker startup via `sqlx::migrate!` (additive, idempotent). Roll the binary back
safely since the schema is additive and tables are append-only.

## Budget (strict recommendation)

| Phase | Infra | Est. monthly |
|-------|-------|--------------|
| **Month 1** | 1 small VPS (2 vCPU / 2 GB / 40 GB) + public RPC free tiers | **$10–$20** |
| **Month 2** | same VPS, maybe a paid RPC tier for reliable L2 logs | **$20–$40** |
| **First live (LATER, only if metrics pass)** | slightly bigger VPS + paid RPC + a little gas capital | **$40–$80 + gas** |

Do not provision Grafana/Redis/bigger boxes until data or a measured bottleneck demands
it. When to upgrade: a *second* heavy component runs continuously, or RPC latency is
*measured* to cost real opportunities — both post-V1.
