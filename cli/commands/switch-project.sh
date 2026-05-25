#!/usr/bin/env bash
# Switch active harness project: env vars, Hermes MCP merge, optional bridge drop-in.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../scripts/lib/paths.sh
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
# shellcheck source=../../scripts/lib/project-manifest.sh
. "$SCRIPT_DIR/../../scripts/lib/project-manifest.sh"

NAME="${1:-}"
[ -n "$NAME" ] || {
  echo "Usage: switch-project.sh <project-name>" >&2
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
REG="$AGENT_HARNESS_HOME/projects/registry.json"

export AEGIS_DEFAULT_PROJECT="$NAME"
export AEGIS_RPC_ROOT="$ROOT"
export AEGIS_WORKSPACE="$ROOT"
export AEGIS_KANBAN_BOARD="${BOARD:-}"

# Persist active project for shell sessions
STATE_DIR="$AGENT_HARNESS_HOME/.harness/state"
mkdir -p "$STATE_DIR"
cat > "$STATE_DIR/active-project.env" <<EOF
# Active harness project — sourced by switch-project
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

# Re-merge Hermes harness MCP for new workspace
if [ -x "$AGENT_HARNESS_HOME/scripts/merge-hermes-harness-mcp.sh" ]; then
  echo "Merging Hermes harness MCP..."
  bash "$AGENT_HARNESS_HOME/scripts/merge-hermes-harness-mcp.sh" "$ROOT" || true
fi

# Optional: patch systemd bridge drop-in
DROPIN_DIR="${HOME}/.config/systemd/user/kiro-openai-bridge.service.d"
DROPIN="${DROPIN_DIR}/harness-workspace.conf"
if [ -d "${HOME}/.config/systemd/user" ]; then
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
