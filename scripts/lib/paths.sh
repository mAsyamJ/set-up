# Shared paths for Aegis hackathon kit scripts. Source from bash: . "$(dirname "$0")/lib/paths.sh"
AEGIS_REPO_ROOT="${AEGIS_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
AEGIS_WORKSPACE="${AEGIS_WORKSPACE:-$AEGIS_REPO_ROOT}"
export AEGIS_REPO_ROOT AEGIS_WORKSPACE

if [ -z "${AEGIS_NODE:-}" ]; then
  if [ -x "${HOME}/.nvm/versions/node/v22.22.2/bin/node" ]; then
    AEGIS_NODE="${HOME}/.nvm/versions/node/v22.22.2/bin/node"
  elif command -v node >/dev/null 2>&1; then
    AEGIS_NODE="$(command -v node)"
  else
    AEGIS_NODE=""
  fi
fi
export AEGIS_NODE

AEGIS_TSX="${AEGIS_TSX:-$(dirname "$AEGIS_NODE")/tsx}"
if [ ! -x "$AEGIS_TSX" ] && [ -x "${AEGIS_REPO_ROOT}/tools/real-hermes-mcp/node_modules/.bin/tsx" ]; then
  AEGIS_TSX="${AEGIS_REPO_ROOT}/tools/real-hermes-mcp/node_modules/.bin/tsx"
fi
export AEGIS_TSX

HERMES_BIN="${HERMES_BIN:-${HOME}/.local/bin/hermes}"
export HERMES_BIN

KIRO_BRIDGE_PORT="${KIRO_BRIDGE_PORT:-8787}"
KIRO_BRIDGE_URL="http://127.0.0.1:${KIRO_BRIDGE_PORT}"
export KIRO_BRIDGE_PORT KIRO_BRIDGE_URL

AEGIS_SYSTEMD_USER_DIR="${AEGIS_SYSTEMD_USER_DIR:-${HOME}/.config/systemd/user}"
export AEGIS_SYSTEMD_USER_DIR
