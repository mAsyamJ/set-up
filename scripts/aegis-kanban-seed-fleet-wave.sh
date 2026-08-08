#!/usr/bin/env bash
# Seed up to 20 fleet child tasks for load testing (idempotent keys).
set -euo pipefail
echo "aegis-kanban-seed-fleet-wave: disabled; fleet is not activated" >&2
exit 2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"
# shellcheck source=lib/project-manifest.sh
source "${SCRIPT_DIR}/lib/project-manifest.sh"

PROJECT="${1:-${AEGIS_RPC_ROOT}}"
COUNT="${2:-20}"
PARENT="${3:-}"

PROJECT="$(cd "$PROJECT" && pwd)"
BOARD="$(kanban_board_for_project "$PROJECT")"
BOARD="${BOARD:-${AEGIS_KANBAN_BOARD:-aegis-hackathon}}"
WS="dir:${PROJECT}"

if ! command -v hermes >/dev/null 2>&1; then
  echo "hermes not in PATH" >&2
  exit 1
fi

echo "Seeding fleet wave: board=$BOARD count=$COUNT project=$PROJECT"

for i in $(seq 1 "$COUNT"); do
  key="fleet-wave-$(basename "$PROJECT")-${i}"
  title="Fleet smoke task ${i}"
  body="Scoped stub task for cursor-fleet load test. Touch only docs/fleet-smoke-${i}.md in worktree."
  args=(--board "$BOARD" create "$title" --idempotency-key "$key" --assignee aegis-builder --workspace "$WS" --body "$body")
  if [ -n "$PARENT" ]; then
    args+=(--parent "$PARENT")
  fi
  hermes kanban "${args[@]}" 2>/dev/null || echo "WARN: skip $key (may exist)"
done

echo "Done. Dispatch: cli/harness cursor-fleet once"
echo "Status:   cli/harness cursor-fleet status"
