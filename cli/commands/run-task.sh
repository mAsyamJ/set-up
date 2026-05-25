#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
PROJECT="${1:-}"
TOOL="${2:-}"
ARGS="${3:-}"
[ -n "$PROJECT" ] && [ -n "$TOOL" ] || {
  echo "Usage: run-task.sh <project-path> <tool> [json-args]" >&2
  exit 1
}
JSON='{}'
if [ -n "$ARGS" ]; then
  JSON="$ARGS"
fi
exec node --import tsx "$AGENT_HARNESS_HOME/tools/gateway/cli.ts" "$PROJECT" "$TOOL" "$JSON"
