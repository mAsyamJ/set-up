# 14 — VPS Runbook

Target: one Ubuntu/Debian VPS, **1–2 vCPU / 1–2 GB RAM / 20–50 GB disk**, ~$10–$30/month.
Dev on Windows + WSL2 (Ubuntu) — identical userland to the VPS. No Docker required (it's
optional). No Kubernetes, no archive node, no managed services.

## Local dev (Windows + WSL2)

```bash
# inside WSL2 Ubuntu
sudo apt update && sudo apt install -y build-essential pkg-config libssl-dev sqlite3 git curl
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # rustup
rustup toolchain install stable      # rust-toolchain.toml pins >= 1.85 for alloy 1.0
git clone <repo> && cd rust-searcher-lab
cp config/local.toml.example config/local.toml   # fill RPC + DB path
cargo build
cargo run --bin cow-shadow-solver -- --config ./config/local.toml
```

## Environment / config

`config/local.toml` and `config/vps.toml` (copy from `.example`). Env vars override TOML:

```
COW_API_BASE_URL=https://api.cow.fi/mainnet
ETH_RPC_URL=https://<your-rpc-provider>      # public/paid RPC; NOT a self-hosted node
DATABASE_URL=sqlite:///var/lib/cow-shadow/cow.db
LOG_LEVEL=info
LOG_JSON=true                                 # true on VPS, false locally
METRICS_BIND_ADDR=127.0.0.1:9100
ALERT_WEBHOOK_URL=                            # optional Telegram/Discord
```

No real secrets in the repo. On the VPS, put env in the systemd unit's `Environment=` or
an `EnvironmentFile=` with `chmod 600`.

## VPS first-time setup

```bash
# as a sudo user on the VPS
sudo apt update && sudo apt install -y build-essential pkg-config libssl-dev sqlite3 git curl
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh && source "$HOME/.cargo/env"

sudo useradd --system --create-home --shell /usr/sbin/nologin cowshadow
sudo mkdir -p /var/lib/cow-shadow /var/backups && sudo chown cowshadow:cowshadow /var/lib/cow-shadow

git clone <repo> /opt/rust-searcher-lab && cd /opt/rust-searcher-lab
cargo build --release                         # builds target/release/cow-shadow-solver
sudo cp target/release/cow-shadow-solver /usr/local/bin/
sudo cp config/vps.toml.example /etc/cow-shadow.toml   # then edit
```

> On a 1 GB VPS, `cargo build --release` may OOM during heavy LTO. Mitigations: add a
> 2 GB swapfile for the build, or build the release binary in WSL2/CI and `scp` it to the
> VPS (the binary is small; the toolchain is the memory hog).

## systemd service

`/etc/systemd/system/cow-shadow.service`:

```ini
[Unit]
Description=CoW Shadow Solver
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=cowshadow
ExecStart=/usr/local/bin/cow-shadow-solver --config /etc/cow-shadow.toml
Restart=always
RestartSec=5
Environment=LOG_JSON=true
Environment=DATABASE_URL=sqlite:///var/lib/cow-shadow/cow.db
Environment=METRICS_BIND_ADDR=127.0.0.1:9100
EnvironmentFile=-/etc/cow-shadow.env
MemoryMax=512M
CPUQuota=80%
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/cow-shadow /var/backups
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cow-shadow
systemctl status cow-shadow
```

## Logs (journald, free)

```bash
journalctl -u cow-shadow -f                       # live
journalctl -u cow-shadow --since "1 hour ago"     # window
journalctl -u cow-shadow -o cat | jq 'select(.fields.abs_rel_error > 0.01)'  # JSON queries
```

journald handles rotation; no logrotate config needed. Cap disk with
`SystemMaxUse=` in `/etc/systemd/journald.conf` if needed.

## Daily report

```bash
/usr/local/bin/cow-shadow-solver report daily --config /etc/cow-shadow.toml
# or schedule via a systemd timer that runs once a day and posts to the webhook
```

## SQLite backup (systemd timer)

`/etc/systemd/system/cow-backup.service`:
```ini
[Service]
Type=oneshot
User=cowshadow
ExecStart=/usr/bin/sqlite3 /var/lib/cow-shadow/cow.db ".backup '/var/backups/cow-%i.db'"
```
`/etc/systemd/system/cow-backup.timer`:
```ini
[Timer]
OnCalendar=daily
Persistent=true
[Install]
WantedBy=timers.target
```
(Resolve `%i`/date in a tiny wrapper script if needed.) Keep the last ~7 backups; prune
older. Restore = stop service, copy a backup over `cow.db`, start service.

## Update / deploy

```bash
cd /opt/rust-searcher-lab && git pull
cargo build --release
sudo systemctl stop cow-shadow
sudo cp target/release/cow-shadow-solver /usr/local/bin/cow-shadow-solver
sudo systemctl start cow-shadow
journalctl -u cow-shadow -f   # confirm clean start + first auction processed
```

Migrations run automatically on startup (`storage::migrations`); they are additive and
idempotent.

## Rollback

```bash
# keep the previous binary
sudo cp /usr/local/bin/cow-shadow-solver /usr/local/bin/cow-shadow-solver.prev  # before update
# to roll back:
sudo systemctl stop cow-shadow
sudo cp /usr/local/bin/cow-shadow-solver.prev /usr/local/bin/cow-shadow-solver
sudo systemctl start cow-shadow
```

Since the DB is append-only and migrations are additive, rolling the binary back is safe
without touching data.

## When to upgrade infra

Only when (a) a *second* product runs continuously and contends for RAM, or (b) public
RPC latency demonstrably costs competitiveness (measured, not assumed). Both are
post-validation problems. For Product 1, the smallest VPS is sufficient.
