#!/usr/bin/env bash
# Idempotently merge harness MCP into ~/.hermes/config.yaml (text-safe; config may contain prose)
set -euo pipefail
echo "merge-hermes-harness-mcp: disabled; use staged isolated Hermes profiles" >&2
exit 2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"

PROJECT="${1:-$AEGIS_RPC_ROOT}"
PROJECT="$(cd "$PROJECT" && pwd)"
HERMES_CONFIG="${HOME}/.hermes/config.yaml"
SNIPPET="$HOME/.hermes/harness-mcp.snippet.yaml"

mkdir -p "${HOME}/.hermes"

python3 "$SCRIPT_DIR/merge-hermes-harness-mcp.py" "$HERMES_CONFIG" "$AGENT_HARNESS_HOME" "$PROJECT"

sed \
  -e "s|@AGENT_HARNESS_HOME@|$AGENT_HARNESS_HOME|g" \
  -e "s|@AEGIS_RPC_ROOT@|$PROJECT|g" \
  "$AGENT_HARNESS_HOME/docs/kit/templates/hermes-config.harness-mcp.yaml" > "$SNIPPET" 2>/dev/null || true
