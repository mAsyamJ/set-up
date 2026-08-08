#!/usr/bin/env bash
set -euo pipefail

echo "cursor-fleet: disabled; approval, lease, recovery, and canary gates have not passed" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"

SUB="${1:-once}"
shift || true

NODE="${AEGIS_NODE:-$(command -v node)}"
if [ -z "$NODE" ] || [ ! -x "$NODE" ]; then
  echo "cursor-fleet: node not found (set AEGIS_NODE or PATH)" >&2
  exit 127
fi

TSX_CLI="$AGENT_HARNESS_HOME/node_modules/tsx/dist/cli.mjs"
if [ -f "$TSX_CLI" ]; then
  exec "$NODE" "$TSX_CLI" "$AGENT_HARNESS_HOME/runtime/cursor-fleet/src/cli.ts" "$SUB" "$@"
fi

TSX="$AGENT_HARNESS_HOME/node_modules/.bin/tsx"
if [ -f "$TSX" ] || [ -L "$TSX" ]; then
  exec "$NODE" "$TSX" "$AGENT_HARNESS_HOME/runtime/cursor-fleet/src/cli.ts" "$SUB" "$@"
fi

echo "cursor-fleet: tsx not found — run npm install in $AGENT_HARNESS_HOME" >&2
exit 127
