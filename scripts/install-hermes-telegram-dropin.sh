#!/usr/bin/env bash
# WSL: Hermes overwrites hermes-gateway.service on start; use a drop-in for Telegram IPv4 fallback.
set -euo pipefail

DROPIN_DIR="${HOME}/.config/systemd/user/hermes-gateway.service.d"
DROPIN_FILE="${DROPIN_DIR}/aegis-telegram.conf"
ENV_FILE="${HOME}/.hermes/.env"

mkdir -p "$DROPIN_DIR"

if ! grep -q '^TELEGRAM_FALLBACK_IPS=' "$ENV_FILE" 2>/dev/null; then
  {
    echo ""
    echo "# WSL: route Telegram Bot API via reachable IPv4 when api.telegram.org IPv6 fails"
    echo "TELEGRAM_FALLBACK_IPS=149.154.167.220,149.154.167.221"
    echo "HERMES_TELEGRAM_HTTP_CONNECT_TIMEOUT=45"
    echo "HERMES_TELEGRAM_HTTP_READ_TIMEOUT=90"
  } >>"$ENV_FILE"
  echo "Appended TELEGRAM_FALLBACK_IPS to $ENV_FILE"
fi

cat >"$DROPIN_FILE" <<'EOF'
[Service]
EnvironmentFile=-/home/asyam/.hermes/.env
Environment=TELEGRAM_FALLBACK_IPS=149.154.167.220,149.154.167.221
Environment=HERMES_TELEGRAM_HTTP_CONNECT_TIMEOUT=45
Environment=HERMES_TELEGRAM_HTTP_READ_TIMEOUT=90
EOF

# Use actual home in EnvironmentFile
sed -i "s|/home/asyam|${HOME}|g" "$DROPIN_FILE"

systemctl --user daemon-reload
systemctl --user restart hermes-gateway.service
echo "Installed $DROPIN_FILE and restarted hermes-gateway"
