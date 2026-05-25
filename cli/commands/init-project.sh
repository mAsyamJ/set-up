#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
TARGET="${1:-}"
NAME="${2:-}"
[ -n "$TARGET" ] || { echo "Usage: init-project.sh <parent-or-path> [name]" >&2; exit 1; }
TEMPLATE="$AGENT_HARNESS_HOME/templates/project"
if [ -n "$NAME" ]; then
  mkdir -p "$TARGET"
  TARGET="$TARGET/$NAME"
fi
mkdir -p "$TARGET/.harness/tasks/"{backlog,active,review,done,blocked} "$TARGET/.harness/state" "$TARGET/.cursor/rules"
if [ -d "$TEMPLATE/.harness" ]; then
  cp -r "$TEMPLATE/.harness/"* "$TARGET/.harness/" 2>/dev/null || true
fi
[ -f "$TEMPLATE/AGENTS.md" ] && cp "$TEMPLATE/AGENTS.md" "$TARGET/"
[ -f "$TEMPLATE/HARNESS.md" ] && cp "$TEMPLATE/HARNESS.md" "$TARGET/"
SLUG="$(basename "$TARGET" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')"
DISPLAY="$(basename "$TARGET")"
if [ -f "$TARGET/.harness/obsidian.config.json" ]; then
  sed -i "s/PROJECT_SLUG/$SLUG/g; s/PROJECT_DISPLAY/$DISPLAY/g" "$TARGET/.harness/obsidian.config.json" 2>/dev/null || \
    sed -i '' "s/PROJECT_SLUG/$SLUG/g; s/PROJECT_DISPLAY/$DISPLAY/g" "$TARGET/.harness/obsidian.config.json" 2>/dev/null || true
fi
echo "Initialized project at: $TARGET"
echo "Edit .harness/project.manifest.json and project-context.md"
