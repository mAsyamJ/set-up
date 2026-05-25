#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
PROJECT="${1:-}"
[ -n "$PROJECT" ] || { echo "Usage: link-project.sh <project-path>" >&2; exit 1; }
PROJECT="$(cd "$PROJECT" && pwd)"
MANIFEST="$PROJECT/.harness/project.manifest.json"
[ -f "$MANIFEST" ] || { echo "Missing manifest: $MANIFEST" >&2; exit 1; }
echo "Linked $PROJECT to harness $AGENT_HARNESS_HOME"
"$SCRIPT_DIR/sync-cursor.sh" "$PROJECT"
"$SCRIPT_DIR/sync-hermes.sh" "$PROJECT"
"$SCRIPT_DIR/doctor.sh" "$PROJECT"
