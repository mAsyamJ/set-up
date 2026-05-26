#!/usr/bin/env bash
# Install cursor-fleet systemd user units.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

UNIT_SRC="${AGENT_HARNESS_HOME}/systemd/user"
UNIT_DST="${AEGIS_SYSTEMD_USER_DIR}"
HOME_ESC="${HOME}"

for unit in cursor-fleet.service cursor-fleet-tick.service cursor-fleet-tick.timer; do
  src="${UNIT_SRC}/${unit}"
  dst="${UNIT_DST}/${unit}"
  [ -f "$src" ] || { echo "missing $src"; exit 1; }
  AEGIS_NODE_DIR="$(dirname "${AEGIS_NODE:-$(command -v node)}")"
  sed "s|@AGENT_HARNESS_HOME@|${AGENT_HARNESS_HOME}|g; s|@AEGIS_RPC_ROOT@|${AEGIS_RPC_ROOT}|g; s|@HOME@|${HOME_ESC}|g; s|@AEGIS_NODE@|${AEGIS_NODE:-$(command -v node)}|g; s|@AEGIS_NODE_DIR@|${AEGIS_NODE_DIR}|g" \
    "$src" > "$dst"
  echo "Installed $dst"
done

systemctl --user daemon-reload
echo "Enable daemon: systemctl --user enable --now cursor-fleet.service"
echo "Or timer tick: systemctl --user enable --now cursor-fleet-tick.timer"
