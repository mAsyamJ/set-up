#!/usr/bin/env bash
# Validate all projects listed in projects/registry.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"
# shellcheck source=lib/project-manifest.sh
. "$SCRIPT_DIR/lib/project-manifest.sh"

REG="$AGENT_HARNESS_HOME/projects/registry.json"
[ -f "$REG" ] || { echo "Missing $REG" >&2; exit 1; }

HARNESS="$AGENT_HARNESS_HOME/cli/harness"
FAIL=0
WARN=0

echo "=== harness-validate-all-projects ==="
echo

while IFS= read -r name; do
  [ -n "$name" ] || continue
  root="$(project_root_from_name "$name")"
  board="$(kanban_board_for_project "$root")"

  echo "----------------------------------------"
  echo "Project: $name"
  echo "Path:    $root"
  echo "Board:   $board"
  echo

  if ! "$HARNESS" doctor "$root" 2>&1; then
    echo "FAIL: doctor $name"
    FAIL=$((FAIL + 1))
  fi

  if [ -f "$root/.harness/state/rag.sqlite" ]; then
    echo "OK: rag.sqlite exists"
  else
    echo "WARN: rag.sqlite missing (run index-project)"
    WARN=$((WARN + 1))
  fi

  if command -v hermes >/dev/null 2>&1 && [ -n "$board" ]; then
    if hermes kanban --board "$board" stats >/dev/null 2>&1; then
      echo "OK: kanban $board stats"
    else
      echo "WARN: kanban $board unavailable"
      WARN=$((WARN + 1))
    fi
  fi

  if [ "$name" = "kreditagent" ] || [ "$name" = "mev-share-backrun-flashloan-arbitrage" ]; then
    opensrc_dir="$root/.harness/research/opensrc-paths"
    count="$(find "$opensrc_dir" -name '*.path' 2>/dev/null | wc -l | tr -d ' ')"
    if [ "${count:-0}" -gt 0 ]; then
      echo "OK: opensrc paths ($count)"
    else
      if [ "$name" = "kreditagent" ]; then
        echo "WARN: no opensrc paths (run kreditagent-opensrc-cache.sh)"
      else
        echo "WARN: no opensrc paths (run scripts/mev-share-backrun-opensrc-cache.sh)"
      fi
      WARN=$((WARN + 1))
    fi
  fi

  echo
done < <(list_registry_project_names)

echo "=== summary: $FAIL project failures, $WARN warnings ==="
exit "$FAIL"
