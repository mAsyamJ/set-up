#!/usr/bin/env bash
# Reconcile .harness/tasks/active/ markdown with Hermes Kanban running/ready cards.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"

PROJECT="${1:-$AEGIS_RPC_ROOT}"
BOARD="${2:-aegis-hackathon}"
PROJECT="$(cd "$PROJECT" && pwd)"
ACTIVE="$PROJECT/.harness/tasks/active"
mkdir -p "$ACTIVE"

echo "=== sync-kanban ==="
echo "Project: $PROJECT"
echo "Board: $BOARD"
echo

if ! command -v hermes >/dev/null 2>&1; then
  echo "ERROR: hermes CLI not found" >&2
  exit 1
fi

list="$(hermes kanban --board "$BOARD" list 2>/dev/null || true)"
if [ -z "$list" ]; then
  echo "WARN: no kanban list output (board empty or unavailable)"
  exit 0
fi

# Parse running/ready tasks — format varies; look for t_ ids and titles
echo "$list" | while IFS= read -r line; do
  kb_id="$(echo "$line" | grep -oE 't_[a-f0-9]+' | head -1 || true)"
  [ -n "$kb_id" ] || continue
  status="$(echo "$line" | awk '{print $NF}' | tr '[:upper:]' '[:lower:]' || true)"
  case "$status" in
    running|ready|in_progress) ;;
    *) continue ;;
  esac

  # Find markdown task with matching kanban_id
  match="$(grep -rl "kanban_id: ${kb_id}" "$PROJECT/.harness/tasks/" 2>/dev/null | head -1 || true)"
  if [ -n "$match" ]; then
    base="$(basename "$match")"
    if [ "$(dirname "$match")" != "$ACTIVE" ]; then
      dest="$ACTIVE/$base"
      if [ ! -f "$dest" ]; then
        cp "$match" "$dest"
        sed -i 's/^status:.*/status: active/' "$dest" 2>/dev/null || true
        echo "ACTIVE: $base (linked $kb_id)"
      fi
    else
      echo "OK: $base already active ($kb_id)"
    fi
  else
    slug="$(echo "$kb_id" | tr '_' '-')"
    stub="$ACTIVE/kanban-${kb_id}.md"
    if [ ! -f "$stub" ]; then
      cat > "$stub" <<EOF
---
id: kanban_${kb_id}
kanban_id: ${kb_id}
title: Kanban ${kb_id}
phase: synced
status: active
---

# Kanban task ${kb_id}

Synced from board \`${BOARD}\`. Update title and acceptance criteria.

## Acceptance criteria

- [ ] Worker completed Kanban card ${kb_id}

## Verification

See \`.harness/project.manifest.json\` commands.
EOF
      echo "STUB: $stub (unlinked kanban card $kb_id)"
    fi
  fi
done

echo
echo "Active tasks:"
find "$ACTIVE" -maxdepth 1 -name '*.md' -printf '%f\n' 2>/dev/null | sort || ls "$ACTIVE"/*.md 2>/dev/null || echo "(none)"
