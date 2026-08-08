#!/usr/bin/env bash
# Create Hermes Kanban board for a harness project and seed one smoke task.
set -euo pipefail
echo "kanban-init-project-board: disabled legacy product automation" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"
# shellcheck source=lib/project-manifest.sh
. "$SCRIPT_DIR/lib/project-manifest.sh"

NAME="${1:-}"
[ -n "$NAME" ] || {
  echo "Usage: kanban-init-project-board.sh <project-name>" >&2
  echo "  e.g. kanban-init-project-board.sh kreditagent" >&2
  exit 1
}

ROOT="$(project_root_from_name "$NAME")"
[ -n "$ROOT" ] && [ -d "$ROOT" ] || {
  echo "Unknown project: $NAME" >&2
  exit 1
}

BOARD="$(kanban_board_for_project "$ROOT")"
[ -n "$BOARD" ] || {
  echo "No kanban board configured for $NAME" >&2
  exit 1
}

DISPLAY="$(python3 -c "
import json
reg = json.load(open('$AGENT_HARNESS_HOME/projects/registry.json'))
print(reg.get('projects', {}).get('$NAME', {}).get('displayName', '$NAME'))
" 2>/dev/null || echo "$NAME")"

if ! command -v hermes >/dev/null 2>&1; then
  echo "ERROR: hermes CLI not found" >&2
  exit 1
fi

echo "=== kanban-init-project-board: $NAME ==="
echo "Board: $BOARD"
echo "Root:  $ROOT"

if hermes kanban boards create "$BOARD" --name "$DISPLAY" 2>/dev/null; then
  echo "Created board $BOARD"
else
  echo "Board $BOARD may already exist (continuing)"
fi

WS="dir:${ROOT}"
TITLE="Harness onboarding smoke"

existing="$(hermes kanban --board "$BOARD" list 2>/dev/null | grep -F "$TITLE" || true)"
if [ -n "$existing" ]; then
  echo "Smoke task already present — skip seed"
else
  echo "Seeding smoke task..."
  hermes kanban --board "$BOARD" create "$TITLE" --workspace "$WS" \
    --idempotency-key "harness-smoke-${NAME}" || true
fi

hermes kanban --board "$BOARD" stats 2>/dev/null || true
echo "Done."
