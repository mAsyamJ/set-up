#!/usr/bin/env bash
# After verify-task passes, enqueue parallel security+qa Kanban reviews (Pattern C).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"

PROJECT="${AEGIS_RPC_ROOT}"
BOARD="${AEGIS_KANBAN_BOARD:-aegis-hackathon}"
TASK_FILE="${1:-}"

if ! command -v hermes >/dev/null 2>&1; then
  echo "parallel-review: hermes not available, skip"
  exit 0
fi

TITLE="Review: ${TASK_FILE:-post-verify}"
WS="dir:${PROJECT}"

for profile in aegis-security aegis-qa; do
  echo "parallel-review: seed ${profile} card"
  hermes kanban --board "$BOARD" add "${TITLE} (${profile})" --workspace "$WS" 2>/dev/null || true
done

echo "parallel-review: done (cards on ${BOARD})"
