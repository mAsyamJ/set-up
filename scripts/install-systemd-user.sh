#!/usr/bin/env bash
set -euo pipefail

echo "install-systemd-user: disabled; legacy batch service installation is quarantined" >&2
exit 2

if [ "${1:-}" != "--apply" ]; then
  echo "Refusing to modify user services without explicit --apply." >&2
  echo "Run diagnostics first: cli/harness doctor" >&2
  exit 2
fi
shift

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

UNIT_SRC="${AEGIS_REPO_ROOT}/systemd/user"
UNIT_DST="${AEGIS_SYSTEMD_USER_DIR}"
[ -n "${AEGIS_RPC_ROOT:-}" ] && [ -d "$AEGIS_RPC_ROOT" ] || {
  echo "Set AEGIS_RPC_ROOT to an existing registered project before rendering units." >&2
  exit 2
}

mkdir -p "$UNIT_DST"

MODEL_STATE="${AEGIS_MODEL_STATE}"
if [ ! -f "$MODEL_STATE" ]; then
  mkdir -p "$(dirname "$MODEL_STATE")"
  printf '%s\n' '{"defaultModel":null,"updatedAt":null,"updatedBy":"install"}' > "$MODEL_STATE"
  chmod 600 "$MODEL_STATE"
  echo "Seeded $MODEL_STATE (no default model)"
fi

for unit in kiro-openai-bridge.service hermes-gateway.service aegis-stack.target aegis-kanban-dispatch.service cursor-fleet.service wsl-portproxy-refresh.service; do
  src="${UNIT_SRC}/${unit}"
  dst="${UNIT_DST}/${unit}"
  if [ ! -f "$src" ]; then
    echo "ERROR: missing unit file: $src"
    exit 1
  fi
  if grep -q '@' "$src" 2>/dev/null; then
    AEGIS_NODE_DIR="$(dirname "${AEGIS_NODE:-$(command -v node)}")"
    rm -f "$dst"
    sed "s|@AGENT_HARNESS_HOME@|${AGENT_HARNESS_HOME}|g; s|@AEGIS_RPC_ROOT@|${AEGIS_RPC_ROOT}|g; s|@AEGIS_NODE@|${AEGIS_NODE:-$(command -v node)}|g; s|@AEGIS_NODE_DIR@|${AEGIS_NODE_DIR}|g; s|@HARNESS_STATE_HOME@|${HARNESS_STATE_HOME}|g; s|@HERMES_BIN@|${HERMES_BIN}|g; s|@HOME@|${HOME}|g" "$src" > "$dst"
    echo "Installed $dst (from template with paths)"
  else
    ln -sf "$src" "$dst"
    echo "Linked $dst -> $src"
  fi
done

systemctl --user daemon-reload
echo
echo "Units rendered and daemon reloaded."
echo "No service was enabled, started, stopped, or restarted."
echo "Fleet and legacy bridge remain disabled in their unit environments."
