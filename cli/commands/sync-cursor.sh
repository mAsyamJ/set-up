#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
PROJECT="${1:-}"
[ -n "$PROJECT" ] || { echo "Usage: sync-cursor.sh <project-path>" >&2; exit 1; }
PROJECT="$(cd "$PROJECT" && pwd)"
RULES_DIR="$PROJECT/.cursor/rules"
TEMPLATE_DIR="$AGENT_HARNESS_HOME/templates/cursor-rules"
mkdir -p "$RULES_DIR"
if [ -d "$TEMPLATE_DIR" ]; then
  for f in "$TEMPLATE_DIR"/*.mdc; do
    [ -f "$f" ] || continue
    cp "$f" "$RULES_DIR/"
  done
  echo "Synced cursor rules to $RULES_DIR"
else
  echo "WARN: no templates at $TEMPLATE_DIR"
fi

MCP_TPL="$AGENT_HARNESS_HOME/templates/cursor-mcp/harness.mcp.example.json"
MCP_DST="$PROJECT/.cursor/mcp.json"
if [ -f "$MCP_TPL" ]; then
  sed "s|@AGENT_HARNESS_HOME@|${AGENT_HARNESS_HOME}|g; s|@AEGIS_RPC_ROOT@|${PROJECT}|g" "$MCP_TPL" > "$MCP_DST"
  echo "Wrote MCP config: $MCP_DST"
fi
