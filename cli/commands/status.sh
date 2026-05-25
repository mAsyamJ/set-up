#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
PROJECT="${1:-}"
[ -n "$PROJECT" ] || { echo "Usage: status.sh <project-path>" >&2; exit 1; }
PROJECT="$(cd "$PROJECT" && pwd)"
echo "=== harness status: $(basename "$PROJECT") ==="
echo "Harness: $AGENT_HARNESS_HOME"
echo "Project: $PROJECT"
for d in backlog active review done; do
  n=0
  [ -d "$PROJECT/.harness/tasks/$d" ] && n=$(find "$PROJECT/.harness/tasks/$d" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l)
  echo "  tasks/$d: $n"
done
