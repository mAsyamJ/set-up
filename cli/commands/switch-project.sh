#!/usr/bin/env bash
# Switch active harness project: env vars, Hermes MCP merge, sync-hermes.
# Bridge reads active-project.env per request — no restart by default.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../scripts/lib/paths.sh
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
# shellcheck source=../../scripts/lib/project-manifest.sh
. "$SCRIPT_DIR/../../scripts/lib/project-manifest.sh"

DEBUG_LOG="${AGENT_HARNESS_HOME}/.cursor/debug-5d3eff.log"

_agent_debug() {
  local message="$1" data="$2" hyp="$3"
  python3 - <<PY 2>/dev/null || true
import json, time
payload = {
  "sessionId": "5d3eff",
  "timestamp": int(time.time() * 1000),
  "location": "switch-project.sh",
  "message": ${message@Q},
  "data": json.loads(${data@Q}),
  "hypothesisId": ${hyp@Q},
  "runId": __import__("os").environ.get("AEGIS_DEBUG_RUN_ID", "pre-fix"),
}
with open(${DEBUG_LOG@Q}, "a", encoding="utf-8") as f:
  f.write(json.dumps(payload) + "\n")
PY
}

NAME=""
RESTART_BRIDGE=0
for arg in "$@"; do
  case "$arg" in
    --restart-bridge) RESTART_BRIDGE=1 ;;
    --no-restart) ;; # legacy alias: default is already no restart
    -*) echo "Unknown flag: $arg" >&2; exit 1 ;;
    *)
      [ -z "$NAME" ] && NAME="$arg"
      ;;
  esac
done

[ -n "$NAME" ] || {
  echo "Usage: switch-project.sh <project-name> [--restart-bridge]" >&2
  echo "  Projects: $(list_registry_project_names | tr '\n' ' ')" >&2
  exit 1
}

ROOT="$(project_root_from_name "$NAME")"
[ -n "$ROOT" ] && [ -d "$ROOT" ] || {
  echo "Unknown project: $NAME" >&2
  exit 1
}

ROOT="$(cd "$ROOT" && pwd)"
BOARD="$(kanban_board_for_project "$ROOT")"

export AEGIS_DEFAULT_PROJECT="$NAME"
export AEGIS_RPC_ROOT="$ROOT"
export AEGIS_WORKSPACE="$ROOT"
export AEGIS_KANBAN_BOARD="${BOARD:-}"

STATE_DIR="$AGENT_HARNESS_HOME/.harness/state"
mkdir -p "$STATE_DIR"
cat > "$STATE_DIR/active-project.env" <<EOF
# Active harness project — sourced by switch-project / harness_switch_project
export AEGIS_DEFAULT_PROJECT=$NAME
export AEGIS_RPC_ROOT=$ROOT
export AEGIS_WORKSPACE=$ROOT
export AEGIS_KANBAN_BOARD=${BOARD:-}
EOF

echo "=== switch-project: $NAME ==="
echo "AEGIS_RPC_ROOT=$ROOT"
echo "AEGIS_WORKSPACE=$ROOT"
echo "AEGIS_KANBAN_BOARD=${BOARD:-}"
echo

# #region agent log
_agent_debug "project switched" "{\"project\":\"$NAME\",\"root\":\"$ROOT\",\"restartBridge\":$RESTART_BRIDGE}" "H2"
# #endregion

if [ -x "$AGENT_HARNESS_HOME/scripts/merge-hermes-harness-mcp.sh" ]; then
  echo "Merging Hermes harness MCP..."
  bash "$AGENT_HARNESS_HOME/scripts/merge-hermes-harness-mcp.sh" "$ROOT" || true
fi

if [ -x "$AGENT_HARNESS_HOME/cli/harness" ]; then
  echo "Syncing Hermes skills..."
  "$AGENT_HARNESS_HOME/cli/harness" sync-hermes "$ROOT" || true
fi

if [ "$RESTART_BRIDGE" -eq 1 ] && [ -d "${HOME}/.config/systemd/user" ]; then
  DROPIN_DIR="${HOME}/.config/systemd/user/kiro-openai-bridge.service.d"
  DROPIN="${DROPIN_DIR}/harness-workspace.conf"
  mkdir -p "$DROPIN_DIR"
  cat > "$DROPIN" <<EOF
[Service]
Environment=AEGIS_WORKSPACE=$ROOT
Environment=AEGIS_RPC_ROOT=$ROOT
Environment=AEGIS_KANBAN_BOARD=${BOARD:-}
EOF
  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user daemon-reload 2>/dev/null || true
    if systemctl --user is-active --quiet kiro-openai-bridge.service 2>/dev/null; then
      systemctl --user restart kiro-openai-bridge.service 2>/dev/null || true
      echo "Restarted kiro-openai-bridge (--restart-bridge)"
      _agent_debug "bridge restarted" "{\"project\":\"$NAME\"}" "H2"
    fi
  fi
else
  echo "Bridge workspace: hot-reload via active-project.env (no restart)"
fi

echo
echo "Active project: $NAME"
echo "Kanban board:   ${BOARD:-unknown}"
echo "State file:     $STATE_DIR/active-project.env"
echo "Harness MCP reads active-project.env on each tool call — gateway restart optional."

# Snapshot harness roles for Hermes dashboard / Kanban (see harness-active-context.json).
WRITER="${AGENT_HARNESS_HOME}/scripts/write-harness-active-context.py"
if [ -f "$WRITER" ]; then
  python3 "$WRITER" "$ROOT" || echo "warning: write-harness-active-context.py failed (non-fatal)" >&2
fi
