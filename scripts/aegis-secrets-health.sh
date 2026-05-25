#!/usr/bin/env bash
# Read-only credential/stack health for headless Hermes (never prints secret values).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

ENV_FILE="${HOME}/.hermes/.env"
BRIDGE_BASE="${KIRO_BRIDGE_URL:-http://127.0.0.1:8787}"
BRIDGE_BASE="${BRIDGE_BASE%/}"
GATEWAY_STATE="${HOME}/.hermes/gateway_state.json"

telegram_status="MISSING"
cursor_status="MISSING"
bridge_configured="unknown"
telegram_connected="unknown"

if [ -f "$ENV_FILE" ]; then
  if grep -qE '^TELEGRAM_BOT_TOKEN=.+' "$ENV_FILE" 2>/dev/null; then
    telegram_status="OK"
  fi
  if grep -qE '^CURSOR_API_KEY=.+' "$ENV_FILE" 2>/dev/null; then
    cursor_status="OK"
  fi
fi

if [ "$cursor_status" != "OK" ] && command -v agent >/dev/null 2>&1; then
  if agent status 2>&1 | grep -qv 'Not logged in'; then
    cursor_status="OK"
  fi
fi

if curl -sf --max-time 6 "${BRIDGE_BASE}/health" >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
  bridge_configured="$(python3 -c "
import json, urllib.request
d = json.load(urllib.request.urlopen('${BRIDGE_BASE}/health'))
c = d.get('providers', {}).get('cursor', {})
print('true' if c.get('configured') else 'false')
" 2>/dev/null || echo unknown)"
  if [ "$bridge_configured" = "true" ] && [ "$cursor_status" != "OK" ]; then
    cursor_status="OK"
  fi
fi

if [ -f "$GATEWAY_STATE" ] && command -v python3 >/dev/null 2>&1; then
  telegram_connected="$(python3 -c "
import json
d = json.load(open('${GATEWAY_STATE}'))
tg = d.get('platforms', {}).get('telegram', {})
print(tg.get('state', 'unknown'))
" 2>/dev/null || echo unknown)"
fi

# One-line summary for PM tick / operators (no secrets)
echo "Credentials: telegram=${telegram_status} cursor=${cursor_status} bridge_configured=${bridge_configured} telegram_gateway=${telegram_connected}"
