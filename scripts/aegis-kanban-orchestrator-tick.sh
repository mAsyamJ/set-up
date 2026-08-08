#!/usr/bin/env bash
# Hermes cron: 30-minute Kanban orchestrator status (no LLM, no bridge).
# Replaces agent+kanban-orchestrator skill tick — use cursor-fleet / Lane O for dispatch.
set -euo pipefail
echo "aegis-kanban-orchestrator-tick: disabled legacy scheduler" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export AGENT_HARNESS_HOME="${AGENT_HARNESS_HOME:-${AEGIS_REPO_ROOT:-$HOME/dev/Project/agent-harness}}"
# shellcheck source=lib/paths.sh
source "${AGENT_HARNESS_HOME}/scripts/lib/paths.sh"
# shellcheck source=lib/project-manifest.sh
source "${AGENT_HARNESS_HOME}/scripts/lib/project-manifest.sh"

utc_now="$(date -u '+%Y-%m-%d %H:%M UTC')"
echo "=== Kanban orchestrator tick — $utc_now ==="
echo "(script-only — no LLM bridge; dispatch via cursor-fleet / aegis-kanban-dispatch.timer)"
echo

if ! command -v hermes >/dev/null 2>&1; then
  echo "WARN: hermes not in PATH — install hermes-gateway stack"
  exit 0
fi

bullet=0
max_bullets=5

emit_bullet() {
  bullet=$((bullet + 1))
  if [ "$bullet" -le "$max_bullets" ]; then
    echo "- $*"
  fi
}

boards="$(list_registry_kanban_boards | sort -u)"
if [ -z "$boards" ]; then
  emit_bullet "No Kanban boards in projects/registry.json"
  exit 0
fi

total_blocked=0
total_running=0
total_ready=0

while IFS= read -r board; do
  [ -n "$board" ] || continue
  list="$(hermes kanban --board "$board" list 2>/dev/null)" || {
    emit_bullet "Board **$board**: stats unavailable"
    continue
  }
  blocked="$(printf '%s\n' "$list" | grep -c 'blocked' 2>/dev/null || true)"
  running="$(printf '%s\n' "$list" | grep -c 'running' 2>/dev/null || true)"
  ready="$(printf '%s\n' "$list" | grep -c 'ready' 2>/dev/null || true)"
  blocked="${blocked//[^0-9]/}"
  running="${running//[^0-9]/}"
  ready="${ready//[^0-9]/}"
  blocked="${blocked:-0}"
  running="${running:-0}"
  ready="${ready:-0}"
  total_blocked=$((total_blocked + blocked))
  total_running=$((total_running + running))
  total_ready=$((total_ready + ready))

  if [ "$blocked" -gt 0 ] || [ "$running" -gt 0 ]; then
    emit_bullet "**$board**: running=$running blocked=$blocked ready=$ready"
  fi
done <<< "$boards"

if [ "$bullet" -eq 0 ]; then
  emit_bullet "All registry boards quiet — running=0 blocked=0 (ready=$total_ready total)"
fi

if [ "$total_blocked" -gt 0 ]; then
  emit_bullet "$total_blocked blocked task(s) fleet-wide — unblock via Telegram or hermes kanban"
fi

if systemctl --user is-active --quiet aegis-kanban-dispatch.timer 2>/dev/null; then
  emit_bullet "Lane O dispatch timer active (headless orchestrate + cursor-fleet)"
else
  emit_bullet "Lane O timer inactive — optional: scripts/install-aegis-kanban-dispatch-timer.sh"
fi

if [ "$bullet" -lt "$max_bullets" ]; then
  emit_bullet "No git push/deploy from this tick (status only)"
fi

echo
echo "Full stats: cli/harness status <project> | hermes kanban --board <name> list"
