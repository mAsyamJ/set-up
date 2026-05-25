#!/usr/bin/env bash
# Optional: user systemd timer that runs bridge-gated `hermes kanban dispatch --max 2` every 15m when ready>0.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

UNIT_SRC="${AEGIS_REPO_ROOT}/systemd/user"
UNIT_DST="${AEGIS_SYSTEMD_USER_DIR}"

for unit in aegis-kanban-dispatch.service aegis-kanban-dispatch.timer; do
  src="${UNIT_SRC}/${unit}"
  dst="${UNIT_DST}/${unit}"
  if [ ! -f "$src" ]; then
    echo "ERROR: missing unit file: $src" >&2
    exit 1
  fi
  if grep -q '@AGENT_HARNESS_HOME@' "$src" 2>/dev/null; then
    rm -f "$dst"
    sed "s|@AGENT_HARNESS_HOME@|${AGENT_HARNESS_HOME}|g; s|@AEGIS_RPC_ROOT@|${AEGIS_RPC_ROOT}|g" "$src" > "$dst"
    echo "Installed $dst (from template with paths)"
  else
    ln -sf "$src" "$dst"
    echo "Linked $dst -> $src"
  fi
done

chmod +x "${AEGIS_REPO_ROOT}/scripts/aegis-kanban-dispatch-once.sh" \
  "${AEGIS_REPO_ROOT}/scripts/aegis-pm-orchestrate-once.sh" \
  "${AEGIS_REPO_ROOT}/scripts/aegis-d3-deploy-once.sh" \
  "${AEGIS_REPO_ROOT}/scripts/aegis-kanban-seed-plan-backlog.sh"

systemctl --user daemon-reload
systemctl --user enable --now aegis-kanban-dispatch.timer

echo
echo "=== aegis-kanban-dispatch.timer ==="
systemctl --user status aegis-kanban-dispatch.timer --no-pager -l || true
echo
echo "Lane O runs every 5m (timer): orchestrate (D3 sync, seed, dispatch) when bridge healthy."
echo "Hands-off tuning (shell env when invoking scripts manually; for systemd use drop-in or Environment=):"
echo "  AEGIS_KANBAN_EXTRA_DISPATCH_WAVES=4  — extra dispatch passes per tick after 45s sleeps (0=single wave)"
echo "  AEGIS_KANBAN_WAVE_SLEEP_SEC=45       — pause between extra waves"
echo "Timer interval override: copy unit or add ~/.config/systemd/user/aegis-kanban-dispatch.timer.d/override.conf"
echo "Logs: journalctl --user -u aegis-kanban-dispatch.service -n 30 --no-pager"
