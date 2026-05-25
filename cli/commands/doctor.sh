#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../scripts/lib/paths.sh
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
# shellcheck source=../../scripts/lib/project-manifest.sh
. "$SCRIPT_DIR/../../scripts/lib/project-manifest.sh"

PROJECT="${1:-$AEGIS_RPC_ROOT}"
PROJECT="$(cd "$PROJECT" 2>/dev/null && pwd || echo "$PROJECT")"
MANIFEST="$PROJECT/.harness/project.manifest.json"
ERR=0
WARN=0

warn() { echo "WARN: $*"; WARN=$((WARN + 1)); }
fail() { echo "FAIL: $*"; ERR=1; }
ok() { echo "OK: $*"; }

echo "=== harness doctor ==="
echo "AGENT_HARNESS_HOME=$AGENT_HARNESS_HOME"
echo "AEGIS_RPC_ROOT=$AEGIS_RPC_ROOT"
echo "Project: $PROJECT"
echo

# Project adapter
[ -f "$MANIFEST" ] || fail "missing $MANIFEST"
[ -f "$PROJECT/.harness/project-context.md" ] || warn "missing project-context.md"
[ -f "$PROJECT/AGENTS.md" ] || warn "missing AGENTS.md"
[ -d "$AGENT_HARNESS_HOME/scripts" ] || fail "missing harness scripts"
[ -d "$AGENT_HARNESS_HOME/docs/kit" ] || warn "missing docs/kit"

# Task folders
for dir in backlog active review done blocked; do
  d="$PROJECT/.harness/tasks/$dir"
  if [ -d "$d" ]; then
    count="$(find "$d" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"
    ok "tasks/$dir ($count files)"
  else
    warn "missing tasks/$dir"
  fi
done

# Bridge health
if command -v curl >/dev/null 2>&1; then
  if curl -sf "$KIRO_BRIDGE_URL/health" >/dev/null 2>&1; then
    ok "bridge $KIRO_BRIDGE_URL/health"
    if curl -sf "$KIRO_BRIDGE_URL/v1/admin/provider" >/dev/null 2>&1; then
      ok "bridge provider admin API"
    else
      warn "bridge provider admin not reachable"
    fi
  else
    warn "bridge not reachable at $KIRO_BRIDGE_URL (run install-systemd-user.sh)"
  fi
else
  warn "curl not available — skipping bridge checks"
fi

# systemd stack
if command -v systemctl >/dev/null 2>&1; then
  for unit in kiro-openai-bridge hermes-gateway; do
    if systemctl --user is-active --quiet "${unit}.service" 2>/dev/null; then
      ok "systemd ${unit}.service active"
    else
      warn "systemd ${unit}.service not active"
    fi
  done
  if systemctl --user is-enabled --quiet aegis-kanban-dispatch.timer 2>/dev/null; then
    ok "aegis-kanban-dispatch.timer enabled"
  else
    warn "aegis-kanban-dispatch.timer not enabled (Lane O)"
  fi
else
  warn "systemctl not available"
fi

# Hermes Kanban
if [ -x "$HERMES_BIN" ] || command -v hermes >/dev/null 2>&1; then
  HBIN="${HERMES_BIN:-hermes}"
  BOARD="$(kanban_board_for_project "$PROJECT")"
  BOARD="${BOARD:-${AEGIS_KANBAN_BOARD:-aegis-hackathon}}"
  if "$HBIN" kanban --board "$BOARD" stats 2>/dev/null | head -5; then
    ok "hermes kanban $BOARD stats"
  else
    warn "hermes kanban stats unavailable (board: $BOARD)"
  fi
else
  warn "hermes CLI not found"
fi

# Hermes harness OS awareness
HERMES_SKILL="${HOME}/.hermes/skills/agent-harness-os/SKILL.md"
if [ -f "$HERMES_SKILL" ]; then
  ok "hermes skill agent-harness-os installed"
else
  warn "hermes skill agent-harness-os missing (run: cli/harness sync-hermes $PROJECT)"
fi
if [ -f "${HOME}/.hermes/config.yaml" ] && grep -q 'harness:' "${HOME}/.hermes/config.yaml" 2>/dev/null; then
  ok "hermes config mcp_servers.harness present"
else
  warn "hermes MCP harness not in ~/.hermes/config.yaml (run: cli/harness sync-hermes $PROJECT)"
fi

echo
echo "=== summary: ${ERR} errors, ${WARN} warnings ==="
exit $ERR
