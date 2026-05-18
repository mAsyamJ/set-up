#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

MCP_DIR="${AEGIS_REPO_ROOT}/tools/real-hermes-mcp"
cd "$MCP_DIR"

if [ ! -x "$AEGIS_NODE" ]; then
  echo "ERROR: node not found. Set AEGIS_NODE or install nvm node v22."
  exit 1
fi

export AEGIS_WORKSPACE HERMES_BIN
if [ ! -x "$AEGIS_TSX" ]; then
  echo "ERROR: tsx not found. Run: cd tools/real-hermes-mcp && npm install"
  exit 1
fi
echo "Starting real-hermes MCP (stdio). Press Ctrl+C to stop."
exec "$AEGIS_TSX" src/server.ts
