#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
. "$SCRIPT_DIR/../../scripts/lib/project-manifest.sh"
PROJECT="${1:-}"
TITLE="${2:-}"
PHASE="${3:-general}"
KANBAN="${4:-}"
WORKTREE="${5:-}"

[ -n "$PROJECT" ] && [ -n "$TITLE" ] || {
  echo "Usage: new-task.sh <project-path> \"title\" [phase] [--kanban] [--worktree]" >&2
  exit 1
}

if [ "$PHASE" = "--kanban" ]; then
  KANBAN=1
  PHASE="general"
fi
if [ "${5:-}" = "--kanban" ]; then
  KANBAN=1
fi
if [ "$PHASE" = "--worktree" ] || [ "${4:-}" = "--worktree" ] || [ "${5:-}" = "--worktree" ]; then
  WORKTREE=1
fi
if [ "${6:-}" = "--kanban" ]; then
  KANBAN=1
fi

PROJECT="$(cd "$PROJECT" && pwd)"
SLUG="$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')"
TASK_ID="task_${SLUG}_$(date +%Y%m%d)"
KANBAN_ID=""
FILE="$PROJECT/.harness/tasks/backlog/${SLUG}.md"
TPL="${AGENT_HARNESS_HOME}/templates/tasks/task.md.tpl"

mkdir -p "$PROJECT/.harness/tasks/backlog"

if [ -f "$TPL" ]; then
  sed -e "s|{{TASK_ID}}|${TASK_ID}|g" \
      -e "s|{{KANBAN_ID}}|${KANBAN_ID}|g" \
      -e "s|{{TITLE}}|${TITLE}|g" \
      -e "s|{{PHASE}}|${PHASE}|g" \
      -e "s|{{OBJECTIVE}}|${TITLE}|g" \
      "$TPL" > "$FILE"
else
  cat > "$FILE" <<EOF
---
id: ${TASK_ID}
kanban_id:
title: ${TITLE}
phase: ${PHASE}
status: backlog
---

# ${TITLE}

Status: backlog

## Acceptance criteria

- [ ] TBD

## Verification

\`\`\`bash
# from project root — see .harness/project.manifest.json commands
\`\`\`
EOF
fi

if [ -n "$KANBAN" ] && command -v hermes >/dev/null 2>&1; then
  BOARD="$(kanban_board_for_project "$PROJECT")"
  BOARD="${BOARD:-${AEGIS_KANBAN_BOARD:-aegis-hackathon}}"
  WS="dir:${PROJECT}"
  echo "Adding Kanban card on board ${BOARD}..."
  if out="$(hermes kanban --board "$BOARD" create "$TITLE" --workspace "$WS" 2>&1)"; then
    echo "$out"
    # Try to extract task id from hermes output (t_xxxxxxxx)
    kb_id="$(echo "$out" | grep -oE 't_[a-f0-9]+' | head -1 || true)"
    if [ -n "$kb_id" ]; then
      KANBAN_ID="$kb_id"
      if grep -q '^kanban_id:' "$FILE"; then
        sed -i "s/^kanban_id:.*/kanban_id: ${KANBAN_ID}/" "$FILE"
      fi
      echo "Linked kanban_id: ${KANBAN_ID}"
      if [ -n "$WORKTREE" ] && [ -f "$SCRIPT_DIR/../../scripts/lib/worktree-pool.sh" ]; then
        # shellcheck source=../../scripts/lib/worktree-pool.sh
        source "$SCRIPT_DIR/../../scripts/lib/worktree-pool.sh"
        wt="$(worktree_allocate "$PROJECT" "$KANBAN_ID")"
        echo "Pre-allocated worktree: $wt"
      fi
    fi
  else
    echo "WARN: hermes kanban create failed (task file still created)" >&2
  fi
fi

echo "Created: $FILE"
echo "id: $TASK_ID"
