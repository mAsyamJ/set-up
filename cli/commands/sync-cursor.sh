#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../scripts/lib/paths.sh
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"

if [ "${1:-}" != "--apply" ] || [ -z "${2:-}" ]; then
  echo "Usage: harness sync-cursor --apply <registered-project> [--replace]" >&2
  exit 2
fi

PROJECT_REF="$2"
REPLACE="${3:-}"
[ -z "$REPLACE" ] || [ "$REPLACE" = "--replace" ] || {
  echo "sync-cursor: unknown option: $REPLACE" >&2
  exit 2
}

RESOLVED="$(python3 "$AGENT_HARNESS_HOME/scripts/project-registry.py" resolve "$PROJECT_REF")"
PROJECT_ID="${RESOLVED%%$'\t'*}"
PROJECT_ROOT="${RESOLVED#*$'\t'}"
NODE_BIN="$(command -v node)"
ENTRYPOINT="$AGENT_HARNESS_HOME/dist/runtime/mcp/harness-mcp-server/src/entrypoints/cursor.js"
MCP_DIR="$PROJECT_ROOT/.cursor"
MCP_PATH="$MCP_DIR/mcp.json"

[ -x "$NODE_BIN" ] || { echo "sync-cursor: Node executable unavailable" >&2; exit 2; }
[ -x "$(command -v jq)" ] || { echo "sync-cursor: jq unavailable" >&2; exit 2; }
[ -f "$ENTRYPOINT" ] || { echo "sync-cursor: build output unavailable" >&2; exit 2; }
if [ -e "$MCP_PATH" ] && [ "$REPLACE" != "--replace" ]; then
  echo "sync-cursor: refusing to overwrite $MCP_PATH without --replace" >&2
  exit 2
fi

mkdir -p "$MCP_DIR"
TEMP="$(mktemp "$MCP_DIR/.mcp.json.XXXXXX")"
trap 'rm -f "$TEMP"' EXIT
jq \
  --arg node "$NODE_BIN" \
  --arg entrypoint "$ENTRYPOINT" \
  --arg project_id "$PROJECT_ID" \
  --arg registry "$HARNESS_PROJECT_REGISTRY" \
  --arg state "$HARNESS_STATE_HOME" \
  '
    .mcpServers.harness.command = $node
    | .mcpServers.harness.args = [$entrypoint]
    | .mcpServers.harness.env.HARNESS_PROJECT_ID = $project_id
    | .mcpServers.harness.env.HARNESS_PROJECT_REGISTRY = $registry
    | .mcpServers.harness.env.HARNESS_STATE_HOME = $state
  ' "$AGENT_HARNESS_HOME/templates/cursor-mcp/harness.mcp.example.json" >"$TEMP"
python3 -m json.tool "$TEMP" >/dev/null
chmod 600 "$TEMP"
mv "$TEMP" "$MCP_PATH"
trap - EXIT
echo "Wrote project-local Cursor MCP config: $MCP_PATH"
