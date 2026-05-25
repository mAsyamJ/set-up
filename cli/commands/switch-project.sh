#!/usr/bin/env bash
# Switch active harness project: env vars, Hermes MCP merge, sync-hermes, optional bridge restart.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../scripts/lib/paths.sh
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
# shellcheck source=../../scripts/lib/project-manifest.sh
. "$SCRIPT_DIR/../../scripts/lib/project-manifest.sh"

NAME=""
NO_RESTART=0
for arg in "$@"; do
  case "$arg" in
    --no-restart) NO_RESTART=1 ;;
    -*) echo "Unknown flag: $arg" >&2; exit 1 ;;
    *)
      [ -z "$NAME" ] && NAME="$arg"
      ;;
  esac
done

[ -n "$NAME" ] || {
  echo "Usage: switch-project.sh <project-name> [--no-restart]" >&2
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

if [ -x "$AGENT_HARNESS_HOME/scripts/merge-hermes-harness-mcp.sh" ]; then
  echo "Merging Hermes harness MCP..."
  bash "$AGENT_HARNESS_HOME/scripts/merge-hermes-harness-mcp.sh" "$ROOT" || true
fi

if [ -x "$AGENT_HARNESS_HOME/cli/harness" ]; then
  echo "Syncing Hermes skills..."
  "$AGENT_HARNESS_HOME/cli/harness" sync-hermes "$ROOT" || true
fi

if [ "$NO_RESTART" -eq 0 ] && [ -d "${HOME}/.config/systemd/user" ]; then
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
      echo "Restarted kiro-openai-bridge with workspace=$ROOT"
    fi
  fi
fi

echo
echo "Active project: $NAME"
echo "Kanban board:   ${BOARD:-unknown}"
echo "State file:     $STATE_DIR/active-project.env"
echo "Harness MCP reads active-project.env on each tool call — gateway restart optional."
