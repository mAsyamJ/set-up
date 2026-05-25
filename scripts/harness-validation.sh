#!/usr/bin/env bash
# Automated harness validation — layers 1–3 from docs/kit/11-validation-checklist.md
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"

PROJECT="${1:-$AEGIS_RPC_ROOT}"
ERR=0
pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*"; ERR=1; }

echo "=== harness-validation ==="
echo "Project: $PROJECT"
echo

# Layer 1
if "${AGENT_HARNESS_HOME}/cli/harness" doctor "$PROJECT"; then
  pass "doctor"
else
  fail "doctor"
fi

if curl -sf "${KIRO_BRIDGE_URL}/health" >/dev/null 2>&1; then
  pass "bridge health"
else
  fail "bridge health (optional if stack not installed)"
fi

# Layer 2
if AEGIS_KANBAN_DRY_RUN=1 bash "${SCRIPT_DIR}/aegis-kanban-dispatch-once.sh"; then
  pass "dispatch dry-run"
else
  fail "dispatch dry-run"
fi

# Layer 3
if (cd "$AGENT_HARNESS_HOME" && npm test >/dev/null 2>&1); then
  pass "npm test (tool policy)"
else
  fail "npm test"
fi

if "${AGENT_HARNESS_HOME}/cli/harness" run-task "$PROJECT" git.status '{}' >/tmp/harness-git-status.json 2>&1; then
  pass "run-task git.status"
else
  fail "run-task git.status"
fi

if timeout 2 node --import tsx "${AGENT_HARNESS_HOME}/runtime/mcp/harness-mcp-server/src/server.ts" </dev/null >/tmp/harness-mcp-smoke.log 2>&1; then
  pass "harness MCP start"
else
  if grep -qiE 'error|cannot find' /tmp/harness-mcp-smoke.log 2>/dev/null; then
    fail "harness MCP start (see /tmp/harness-mcp-smoke.log)"
  else
    pass "harness MCP start (timeout expected)"
  fi
fi

echo
if [ "$ERR" -eq 0 ]; then
  echo "=== validation PASSED ==="
  exit 0
else
  echo "=== validation FAILED ==="
  exit 1
fi
