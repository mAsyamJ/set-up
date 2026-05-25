#!/usr/bin/env bash
# Harness smoke: stack health + doctor + dispatch dry-run gates
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../scripts/lib/paths.sh
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"

PROJECT="${1:-$AEGIS_RPC_ROOT}"
ERR=0

echo "=== harness smoke ==="
echo "Project: $PROJECT"
echo

# Layer 1: aegis-dev stack checks (non-fatal for optional services)
if [ -x "${AGENT_HARNESS_HOME}/scripts/start-aegis-dev.sh" ]; then
  if "${AGENT_HARNESS_HOME}/scripts/start-aegis-dev.sh"; then
    echo "OK: start-aegis-dev"
  else
    echo "FAIL: start-aegis-dev"
    ERR=1
  fi
else
  echo "WARN: start-aegis-dev.sh missing"
fi
echo

# Layer 2: harness doctor
if "${SCRIPT_DIR}/doctor.sh" "$PROJECT"; then
  echo "OK: harness doctor"
else
  echo "FAIL: harness doctor"
  ERR=1
fi
echo

# Layer 3: dispatch dry-run (bridge gate only, no dispatch if bridge down)
if curl -sf "${KIRO_BRIDGE_URL}/health" >/dev/null 2>&1; then
  echo "=== dispatch gate (dry) ==="
  if [ -x "${AGENT_HARNESS_HOME}/scripts/aegis-kanban-dispatch-once.sh" ]; then
    AEGIS_KANBAN_DRY_RUN=1 bash "${AGENT_HARNESS_HOME}/scripts/aegis-kanban-dispatch-once.sh" 2>&1 || true
    echo "OK: dispatch script executable (dry-run or gated)"
  fi
else
  echo "SKIP: dispatch dry-run (bridge down)"
fi

# Provider state
if [ -x "${AGENT_HARNESS_HOME}/scripts/aegis-model.sh" ]; then
  echo
  echo "=== provider state ==="
  "${AGENT_HARNESS_HOME}/scripts/aegis-model.sh" status 2>/dev/null || true
fi

# Hermes harness OS sync
echo
echo "=== hermes harness awareness ==="
if [ -f "${HOME}/.hermes/skills/agent-harness-os/SKILL.md" ]; then
  echo "OK: agent-harness-os skill"
else
  echo "WARN: agent-harness-os skill missing — run: cli/harness sync-hermes $PROJECT"
fi
if [ -f "${HOME}/.hermes/config.yaml" ] && grep -q 'harness:' "${HOME}/.hermes/config.yaml" 2>/dev/null; then
  echo "OK: harness MCP in hermes config"
else
  echo "WARN: harness MCP not merged — run: cli/harness sync-hermes $PROJECT"
fi

echo
if [ "$ERR" -eq 0 ]; then
  echo "=== smoke PASSED ==="
  exit 0
else
  echo "=== smoke FAILED ==="
  exit 1
fi
