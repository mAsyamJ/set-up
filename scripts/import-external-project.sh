#!/usr/bin/env bash
# Copy external repo into agent-harness/projects/<name> and scaffold .harness/
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"

NAME="${1:-}"
SOURCE="${2:-}"
[ -n "$NAME" ] && [ -n "$SOURCE" ] || {
  echo "Usage: import-external-project.sh <slug> <source-path>" >&2
  echo "  e.g. import-external-project.sh kreditagent ~/dev/Project/KreditAgent/kreditagent-hackathon" >&2
  exit 1
}

SOURCE="$(cd "$SOURCE" && pwd)"
DEST="$AGENT_HARNESS_HOME/projects/$NAME"
TEMPLATE="$AGENT_HARNESS_HOME/templates/project"

if [ -d "$DEST" ] && [ "$(ls -A "$DEST" 2>/dev/null | head -1)" ]; then
  echo "WARN: destination exists: $DEST (rsync will merge/update)"
fi
mkdir -p "$DEST"

RSYNC_EXCLUDES=(
  --exclude 'node_modules/'
  --exclude '.next/'
  --exclude 'dist/'
  --exclude 'out/'
  --exclude 'cache/'
  --exclude 'broadcast/'
  --exclude '.turbo/'
  --exclude '.harness/state/'
)

if [ "$NAME" = "kreditagent" ]; then
  RSYNC_EXCLUDES+=(--exclude 'external/')
fi

echo "=== import-external-project: $NAME ==="
echo "Source: $SOURCE"
echo "Dest:   $DEST"

TAR_EXCLUDES=()
for ex in "${RSYNC_EXCLUDES[@]}"; do
  TAR_EXCLUDES+=(--exclude="${ex#--exclude }")
done

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "${RSYNC_EXCLUDES[@]}" "$SOURCE/" "$DEST/"
else
  echo "rsync not found — using tar copy"
  mkdir -p "$DEST"
  tar -C "$SOURCE" -cf - "${TAR_EXCLUDES[@]}" . | tar -C "$DEST" -xf -
fi

mkdir -p "$DEST/.harness/tasks/"{backlog,active,review,done,blocked} \
         "$DEST/.harness/state" \
         "$DEST/.harness/research/opensrc-paths" \
         "$DEST/.cursor/rules"

if [ "$NAME" = "retropick" ] && [ -d "$DEST/.git" ]; then
  echo "Initializing git submodules..."
  (cd "$DEST" && git submodule update --init --recursive 2>/dev/null || true)
fi

echo "Scaffold harness adapter (template placeholders — customize manifest after import)"
if [ -d "$TEMPLATE/.harness" ]; then
  for f in obsidian.config.json rag.config.json; do
    [ -f "$TEMPLATE/.harness/$f" ] && [ ! -f "$DEST/.harness/$f" ] && cp "$TEMPLATE/.harness/$f" "$DEST/.harness/$f"
  done
  [ ! -f "$DEST/.harness/project-context.md" ] && [ -f "$TEMPLATE/.harness/project-context.md" ] && \
    cp "$TEMPLATE/.harness/project-context.md" "$DEST/.harness/project-context.md"
fi

echo ""
echo "Imported $NAME -> $DEST"
echo "Original source unchanged: $SOURCE"
echo "Next: customize .harness/project.manifest.json and run link-project"
