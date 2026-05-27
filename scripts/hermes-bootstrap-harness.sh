#!/usr/bin/env bash
# One-shot: wire Harness OS into Hermes for Hermes-only operation.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"
# shellcheck source=lib/project-manifest.sh
. "$SCRIPT_DIR/lib/project-manifest.sh"

DEFAULT="${1:-${AEGIS_DEFAULT_PROJECT:-aegis-rpc}}"

echo "=== hermes-bootstrap-harness ==="
echo "Harness: $AGENT_HARNESS_HOME"
echo "Default project: $DEFAULT"
echo

# Ensure ops Kanban board exists
if [ -x "$SCRIPT_DIR/kanban-init-project-board.sh" ]; then
  bash "$SCRIPT_DIR/kanban-init-project-board.sh" ops 2>/dev/null || true
fi

# Switch + sync default project
"$AGENT_HARNESS_HOME/cli/harness" switch-project "$DEFAULT" --no-restart

# Index all registry projects (best-effort)
while IFS= read -r name; do
  [ -n "$name" ] || continue
  root="$(project_root_from_name "$name")"
  [ -d "$root" ] || continue
  echo "Indexing $name..."
  "$AGENT_HARNESS_HOME/cli/harness" obsidian init "$root" 2>/dev/null || true
  "$AGENT_HARNESS_HOME/cli/harness" index-project "$root" 2>/dev/null || echo "WARN: index $name skipped"
done < <(list_registry_project_names)

echo
echo "=== cursor fleet config ==="
if [ -f "$SCRIPT_DIR/merge-hermes-kanban-fleet.py" ]; then
  python3 "$SCRIPT_DIR/merge-hermes-kanban-fleet.py" "${HOME}/.hermes/config.yaml" || true
fi

if [ -x "$SCRIPT_DIR/install-cursor-fleet-systemd.sh" ]; then
  bash "$SCRIPT_DIR/install-cursor-fleet-systemd.sh" 2>/dev/null || true
  systemctl --user enable cursor-fleet.service 2>/dev/null || true
  systemctl --user restart cursor-fleet.service 2>/dev/null || true
  echo "OK: cursor-fleet service enabled (best-effort)"
fi

echo
echo "=== fleet validation ==="
bash "$SCRIPT_DIR/harness-validate-all-projects.sh" || true

echo
echo "=== hermes cron (script-only kanban tick) ==="
if [ -x "$SCRIPT_DIR/fix-kanban-orchestrator-cron.sh" ]; then
  bash "$SCRIPT_DIR/fix-kanban-orchestrator-cron.sh" 2>/dev/null || true
fi

if command -v systemctl >/dev/null 2>&1; then
  systemctl --user restart kiro-openai-bridge.service 2>/dev/null || true
  systemctl --user restart hermes-gateway.service 2>/dev/null || true
  echo "OK: restarted kiro-openai-bridge + hermes-gateway"
fi

echo
echo "=== bootstrap complete ==="
echo "Telegram acceptance:"
echo "  1. Send /reset"
echo "  2. Ask: What harness tools and projects do you have?"
echo "  3. Ask: Switch to ops and capture a marketing note"
echo "  4. curl -sf http://127.0.0.1:8787/health | check workspace field"
