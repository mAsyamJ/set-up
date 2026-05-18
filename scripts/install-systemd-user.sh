#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

UNIT_SRC="${AEGIS_REPO_ROOT}/systemd/user"
UNIT_DST="${AEGIS_SYSTEMD_USER_DIR}"

mkdir -p "$UNIT_DST"

for unit in kiro-openai-bridge.service hermes-gateway.service aegis-stack.target; do
  src="${UNIT_SRC}/${unit}"
  dst="${UNIT_DST}/${unit}"
  if [ ! -f "$src" ]; then
    echo "ERROR: missing unit file: $src"
    exit 1
  fi
  ln -sf "$src" "$dst"
  echo "Linked $dst -> $src"
done

systemctl --user daemon-reload
systemctl --user enable aegis-stack.target
systemctl --user restart kiro-openai-bridge.service

echo "Waiting for Kiro bridge health at ${KIRO_BRIDGE_URL}/health ..."
ready=0
for _ in $(seq 1 30); do
  if curl -sf "${KIRO_BRIDGE_URL}/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "WARN: bridge health check failed. Logs:"
  journalctl --user -u kiro-openai-bridge -n 20 --no-pager -l || true
  exit 1
fi

systemctl --user start aegis-stack.target

# Legacy path: direct kiro-cli Telegram bot (no Hivemind hooks). Keep disabled.
if systemctl --user list-unit-files telegram-kiro-gateway.service &>/dev/null; then
  systemctl --user disable --now telegram-kiro-gateway.service 2>/dev/null || true
  systemctl --user mask telegram-kiro-gateway.service 2>/dev/null || true
  echo "telegram-kiro-gateway: disabled and masked (use hermes-gateway for Telegram)"
fi

echo
echo "=== aegis-stack status ==="
systemctl --user status kiro-openai-bridge hermes-gateway aegis-stack.target --no-pager -l || true
echo
curl -sf "${KIRO_BRIDGE_URL}/health" && echo
