#!/usr/bin/env bash
# Smoke-test Cursor provider on kiro-openai-bridge (health + optional completion).
set -euo pipefail
echo "smoke-cursor-bridge: disabled; the legacy bridge is not part of Harness v1" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "OK   $*"
}

echo "=== Cursor bridge smoke (${KIRO_BRIDGE_URL}) ==="

health_json="$(curl -sf "${KIRO_BRIDGE_URL}/health" 2>/dev/null)" || fail "bridge not reachable at ${KIRO_BRIDGE_URL}/health"

configured="$(printf '%s' "$health_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('1' if d.get('providers', {}).get('cursor', {}).get('configured') else '0')
" 2>/dev/null || echo 0)"

bridge_mode="$(printf '%s' "$health_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('providers', {}).get('cursor', {}).get('bridgeMode', 'unknown'))
" 2>/dev/null || echo unknown)"

pass "bridge health"
echo "Cursor configured: ${configured}"
echo "Cursor bridgeMode: ${bridge_mode}"

provider_json="$(curl -sf "${KIRO_BRIDGE_URL}/v1/admin/provider" 2>/dev/null)" || fail "admin provider endpoint failed"
echo "$provider_json" | python3 -m json.tool 2>/dev/null || echo "$provider_json"

if [ "$configured" != "1" ]; then
  echo "SKIP completion smoke (run scripts/setup-cursor-bridge-auth.sh first)"
  exit 0
fi

echo
echo "=== Cursor completion smoke (short prompt) ==="
completion_json="$(curl -sf --max-time 120 "${KIRO_BRIDGE_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"model":"cursor-composer-2","messages":[{"role":"user","content":"Reply with exactly: CURSOR_BRIDGE_OK"}]}')" \
  || fail "chat completion request failed"

content="$(printf '%s' "$completion_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
choices = d.get('choices') or []
if not choices:
    raise SystemExit('no choices in response')
msg = choices[0].get('message') or {}
print((msg.get('content') or '').strip())
" 2>/dev/null)" || fail "could not parse completion response"

if [ -z "$content" ]; then
  fail "empty assistant content"
fi

echo "Assistant (first 200 chars): ${content:0:200}"
pass "cursor-composer-2 returned content"
