#!/usr/bin/env bash
# One-shot: if bridge is healthy and board has ready work, dispatch workers.
# When AEGIS_CURSOR_FLEET_ENABLED=1, cursor-fleet owns workers (worktree-isolated SDK agents).
# Otherwise falls back to hermes kanban dispatch via bridge profiles.
set -euo pipefail

echo "aegis-kanban-dispatch-once: disabled; transactional Harness workers are not active" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"
# shellcheck source=lib/project-manifest.sh
source "${SCRIPT_DIR}/lib/project-manifest.sh"

DISPATCH_MAX="${AEGIS_KANBAN_DISPATCH_MAX:-${AEGIS_CURSOR_FLEET_MAX_CONCURRENT:-4}}"

dispatch_board_once() {
  local board="$1"
  local stats ready running slots max

  stats="$(hermes kanban --board "$board" stats 2>/dev/null || true)"
  ready="$(echo "$stats" | awk '$1 == "ready" { print $2; exit }')"
  running="$(echo "$stats" | awk '$1 == "running" { print $2; exit }')"
  ready="${ready:-0}"
  running="${running:-0}"
  max="$DISPATCH_MAX"

  if ! [[ "$ready" =~ ^[0-9]+$ ]]; then
    echo "aegis-kanban-dispatch-once: could not parse ready count for $board, skip" >&2
    return 0
  fi

  if [ "$ready" -lt 1 ]; then
    echo "aegis-kanban-dispatch-once: board=$board ready=$ready, nothing to dispatch"
    return 0
  fi

  if [ "${AEGIS_KANBAN_DRY_RUN:-0}" = "1" ]; then
    echo "aegis-kanban-dispatch-once: DRY_RUN board=$board ready=$ready max=$max"
    return 0
  fi

  if [ "${AEGIS_CURSOR_FLEET_ENABLED:-0}" = "1" ]; then
    echo "aegis-kanban-dispatch-once: board=$board ready=$ready → cursor-fleet once (max concurrent=$max)"
    AEGIS_KANBAN_BOARD="$board" "${AGENT_HARNESS_HOME}/cli/harness" cursor-fleet once
    return 0
  fi

  slots=$((max - running))
  if [ "$slots" -lt 1 ]; then
    echo "aegis-kanban-dispatch-once: board=$board slots full (running=$running max=$max)"
    return 0
  fi

  echo "aegis-kanban-dispatch-once: board=$board ready=$ready → hermes kanban dispatch --max $slots"
  hermes kanban --board "$board" dispatch --max "$slots"
}

BRIDGE_BASE="${KIRO_BRIDGE_URL:-http://127.0.0.1:8787}"
BRIDGE_BASE="${BRIDGE_BASE%/}"

if ! curl -sf --max-time 8 "${BRIDGE_BASE}/health" >/dev/null 2>&1; then
  echo "aegis-kanban-dispatch-once: bridge unhealthy (${BRIDGE_BASE}/health), skip dispatch" >&2
  exit 0
fi

if ! command -v hermes >/dev/null 2>&1; then
  echo "aegis-kanban-dispatch-once: hermes not in PATH, skip" >&2
  exit 0
fi

if [ -n "${AEGIS_KANBAN_BOARD:-}" ]; then
  dispatch_board_once "$AEGIS_KANBAN_BOARD"
  exit 0
fi

boards="$(list_registry_kanban_boards | sort -u || true)"
if [ -z "$boards" ]; then
  dispatch_board_once "aegis-hackathon"
  exit 0
fi

while IFS= read -r board; do
  [ -n "$board" ] || continue
  dispatch_board_once "$board" || true
done <<< "$boards"
