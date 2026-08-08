#!/usr/bin/env bash
# Repair headless credentials: restart services, refresh Cursor auth (no secret echo).
set -euo pipefail
echo "aegis-secrets-maintain: disabled legacy service credential flow" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

ENV_FILE="${HOME}/.hermes/.env"
CHECK_ONLY="${1:-}"

health_out="$("${SCRIPT_DIR}/aegis-secrets-health.sh" 2>/dev/null || true)"
echo "$health_out"

if [ "$CHECK_ONLY" = "--check-only" ]; then
  if echo "$health_out" | grep -q 'telegram=OK' && echo "$health_out" | grep -q 'cursor=OK'; then
    exit 0
  fi
  exit 1
fi

repaired=0

if grep -qE '^CURSOR_API_KEY=.+' "$ENV_FILE" 2>/dev/null; then
  echo "Maintaining: CURSOR_API_KEY present — restarting kiro-openai-bridge"
  systemctl --user restart kiro-openai-bridge.service 2>/dev/null || true
  sleep 2
  repaired=1
fi

if command -v agent >/dev/null 2>&1 && agent status 2>&1 | grep -qv 'Not logged in'; then
  echo "Maintaining: Cursor agent session — running setup-cursor-bridge-auth"
  "${SCRIPT_DIR}/setup-cursor-bridge-auth.sh" || true
  repaired=1
fi

if [ -f "${SCRIPT_DIR}/aegis-model.sh" ]; then
  "${SCRIPT_DIR}/aegis-model.sh" cursor 2>/dev/null || true
fi

systemctl --user restart hermes-gateway.service 2>/dev/null || true
sleep 2

health_after="$("${SCRIPT_DIR}/aegis-secrets-health.sh" 2>/dev/null || true)"
echo "$health_after"

if echo "$health_after" | grep -q 'telegram=OK' && echo "$health_after" | grep -q 'cursor=OK'; then
  echo "aegis-secrets-maintain: OK"
  exit 0
fi

echo "aegis-secrets-maintain: action required (do not paste keys in Telegram):" >&2
echo "  - Set TELEGRAM_BOT_TOKEN in ~/.hermes/.env" >&2
echo "  - Set CURSOR_API_KEY in ~/.hermes/.env OR run: agent login (interactive)" >&2
echo "  - Then: scripts/fix-hermes-telegram-gate.sh" >&2
exit 1
