#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

cd "$AEGIS_REPO_ROOT"

ok=0
fail=0

pass() { echo "OK   $*"; ok=$((ok + 1)); }
bad() { echo "FAIL $*"; fail=$((fail + 1)); }

echo "=== Aegis local environment ==="
echo "Workspace: $AEGIS_REPO_ROOT"
echo

echo "=== systemd aegis-stack ==="
if [ -f "${AEGIS_SYSTEMD_USER_DIR}/aegis-stack.target" ]; then
  systemctl --user daemon-reload 2>/dev/null || true
  systemctl --user start aegis-stack.target 2>/dev/null || systemctl --user restart kiro-openai-bridge.service 2>/dev/null || true
else
  echo "Units not installed. Run: ${AEGIS_REPO_ROOT}/scripts/install-systemd-user.sh"
  bad "systemd units missing (run install-systemd-user.sh)"
fi

echo "=== Kiro OpenAI bridge (${KIRO_BRIDGE_URL}) ==="
bridge_ok=0
for _ in $(seq 1 30); do
  if curl -sf "${KIRO_BRIDGE_URL}/health" >/dev/null 2>&1; then
    bridge_ok=1
    break
  fi
  sleep 1
done
if [ "$bridge_ok" -eq 1 ]; then
  pass "kiro-openai-bridge health"
  health_json="$(curl -sf "${KIRO_BRIDGE_URL}/health" 2>/dev/null || true)"
  echo "$health_json"
  if command -v python3 >/dev/null 2>&1 && [ -n "$health_json" ]; then
    default_model="$(printf '%s' "$health_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('defaultModel','unknown'))" 2>/dev/null || echo unknown)"
    echo "Default model: ${default_model}"
    hermes_model=""
    if [ -f "${HOME}/.hermes/config.yaml" ]; then
      hermes_model="$(python3 -c "
import re, pathlib
text = pathlib.Path('${HOME}/.hermes/config.yaml').read_text(encoding='utf-8', errors='ignore')
m = re.search(r'^model:\\s*\\n(?:\\s+\\w+:.*\\n)*?\\s+default:\\s*(\\S+)', text, re.M)
print(m.group(1) if m else '')
" 2>/dev/null || true)"
    fi
    if [ -n "$hermes_model" ] && [ "$hermes_model" != "$default_model" ]; then
      echo "WARN Hermes config model (${hermes_model}) != bridge default (${default_model})"
      if [ -x "${AEGIS_REPO_ROOT}/scripts/aegis-model.sh" ]; then
        if [ "$hermes_model" = "kiro-current" ] || [ "$hermes_model" = "cursor-composer-2" ]; then
          echo "Syncing bridge default to ${hermes_model}..."
          if [ "$hermes_model" = "cursor-composer-2" ]; then
            "${AEGIS_REPO_ROOT}/scripts/aegis-model.sh" cursor >/dev/null 2>&1 || true
          else
            "${AEGIS_REPO_ROOT}/scripts/aegis-model.sh" kiro >/dev/null 2>&1 || true
          fi
          health_json="$(curl -sf "${KIRO_BRIDGE_URL}/health" 2>/dev/null || true)"
          default_model="$(printf '%s' "$health_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('defaultModel','unknown'))" 2>/dev/null || echo unknown)"
          echo "Bridge default after sync: ${default_model}"
        fi
      fi
    fi
    if [ "$default_model" = "cursor-composer-2" ]; then
      cursor_ok="$(printf '%s' "$health_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print('1' if d.get('providers',{}).get('cursor',{}).get('configured') else '0')" 2>/dev/null || echo 0)"
      if [ "$cursor_ok" != "1" ]; then
        bad "Cursor selected but not configured (run scripts/setup-cursor-bridge-auth.sh or set CURSOR_API_KEY)"
      fi
    fi
  fi
  echo
else
  bad "kiro-openai-bridge not reachable (check: journalctl --user -u kiro-openai-bridge -n 30)"
fi

echo "=== Real Hermes CLI ==="
if command -v hermes >/dev/null 2>&1; then
  pass "hermes binary: $(command -v hermes)"
else
  bad "hermes CLI not found"
fi

echo "=== Hermes gateway ==="
if command -v hermes >/dev/null 2>&1; then
  if systemctl --user is-active --quiet hermes-gateway 2>/dev/null; then
    pass "hermes-gateway systemd active"
    hermes gateway status 2>/dev/null | head -8 || true
  else
    bad "hermes-gateway systemd not active"
  fi
  hermes config check 2>/dev/null | head -10 || bad "hermes config check failed"
else
  bad "skipped gateway checks (no hermes)"
fi
echo

echo "=== real-hermes MCP smoke ==="
if [ -x "$AEGIS_TSX" ]; then
  MCP_DIR="${AEGIS_REPO_ROOT}/tools/real-hermes-mcp"
  if [ -f "${MCP_DIR}/src/server.ts" ]; then
    (
      cd "$MCP_DIR"
      timeout 3 "$AEGIS_TSX" src/server.ts </dev/null >/tmp/real-hermes-mcp-smoke.log 2>&1 &
      MCP_PID=$!
      sleep 1
      kill "$MCP_PID" 2>/dev/null || true
      wait "$MCP_PID" 2>/dev/null || true
    )
    if grep -qiE 'error|cannot find' /tmp/real-hermes-mcp-smoke.log 2>/dev/null; then
      bad "MCP smoke (see /tmp/real-hermes-mcp-smoke.log)"
    else
      pass "MCP server starts (stdio)"
    fi
  else
    bad "MCP server.ts missing"
  fi
else
  bad "tsx not found (cd tools/real-hermes-mcp && npm install)"
fi

echo "=== Hivemind shared memory ==="
if command -v hivemind >/dev/null 2>&1; then
  if "${SCRIPT_DIR}/verify-hivemind-shared-memory.sh" >/tmp/aegis-hivemind-verify.log 2>&1; then
    pass "hivemind verify (see /tmp/aegis-hivemind-verify.log)"
    "${SCRIPT_DIR}/sync-hivemind-local-index.sh" >/dev/null 2>&1 && pass "local index synced" || true
  else
    bad "hivemind verify failed (see /tmp/aegis-hivemind-verify.log)"
  fi
else
  bad "hivemind CLI not installed"
fi

echo
echo "=== Summary: ${ok} passed, ${fail} failed ==="
if [ "$fail" -gt 0 ]; then
  echo "Fix failures above, then retry."
  exit 1
fi

echo "Ready. Start Kiro with:"
echo "  cd ${AEGIS_REPO_ROOT} && kiro-cli --agent aegis-orchestrator"
