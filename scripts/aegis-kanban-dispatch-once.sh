#!/usr/bin/env bash
# One-shot: if bridge is healthy and board has ready work, run Hermes dispatch (max 2).
# Intended for systemd timer / manual waves — does not start an LLM on the gateway by itself.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

BOARD="${AEGIS_KANBAN_BOARD:-aegis-hackathon}"
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

stats="$(hermes kanban --board "$BOARD" stats 2>/dev/null || true)"
ready="$(echo "$stats" | awk '$1 == "ready" { print $2; exit }')"
ready="${ready:-0}"

if ! [[ "$ready" =~ ^[0-9]+$ ]]; then
  echo "aegis-kanban-dispatch-once: could not parse ready count, skip" >&2
  exit 0
fi

if [ "$ready" -lt 1 ]; then
  echo "aegis-kanban-dispatch-once: ready=$ready, nothing to dispatch"
  exit 0
fi

if [ "${AEGIS_KANBAN_DRY_RUN:-0}" = "1" ]; then
  echo "aegis-kanban-dispatch-once: DRY_RUN ready=$ready (would dispatch --max 2)"
  exit 0
fi

echo "aegis-kanban-dispatch-once: ready=$ready → hermes kanban dispatch --max 2"
exec hermes kanban --board "$BOARD" dispatch --max 2
