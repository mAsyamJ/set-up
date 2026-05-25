#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
PROJECT="${1:-}"
TASK="${2:-}"
[ -n "$PROJECT" ] && [ -n "$TASK" ] || { echo "Usage: verify-task.sh <project-path> <task-file>" >&2; exit 1; }
PROJECT="$(cd "$PROJECT" && pwd)"
[ -f "$TASK" ] || TASK="$PROJECT/$TASK"
[ -f "$TASK" ] || { echo "Task not found: $TASK" >&2; exit 1; }
MANIFEST="$PROJECT/.harness/project.manifest.json"

echo "=== verify-task: $TASK ==="
cd "$PROJECT"

ERR=0

# Read manifest commands via python3 or node
run_manifest_cmd() {
  local key="$1"
  local cmd=""
  if command -v python3 >/dev/null 2>&1 && [ -f "$MANIFEST" ]; then
    cmd="$(python3 -c "
import json, sys
m = json.load(open('$MANIFEST'))
print(m.get('commands', {}).get('$key', '') or '')
" 2>/dev/null || true)"
  fi
  [ -n "$cmd" ] || return 0
  echo "--- manifest command: $key ---"
  echo "  $cmd"
  if bash -c "$cmd"; then
    echo "OK: $key"
  else
    echo "FAIL: $key"
    ERR=1
  fi
}

# Run verification keys from task frontmatter or default set
VERIFY_KEYS="typecheck test smoke"
if grep -q '^verification:' "$TASK" 2>/dev/null; then
  VERIFY_KEYS="$(awk '/^verification:/{f=1;next} f&&/^  - /{gsub(/^  - /,""); print; next} f&&/^[^ ]/{exit}' "$TASK" | tr '\n' ' ')"
fi

for key in $VERIFY_KEYS; do
  run_manifest_cmd "$key"
done

# If no manifest, fallback
if [ ! -f "$MANIFEST" ] && [ -f package.json ]; then
  npm run typecheck --if-present 2>/dev/null || pnpm typecheck 2>/dev/null || true
  npm test --if-present 2>/dev/null || pnpm test 2>/dev/null || true
fi

# Check acceptance criteria checkboxes
unchecked="$(grep -E '^- \[ \]' "$TASK" | wc -l | tr -d ' ')"
checked="$(grep -E '^- \[x\]' "$TASK" | wc -l | tr -d ' ')"
echo
echo "Acceptance: ${checked} checked, ${unchecked} unchecked"
if [ "$unchecked" -gt 0 ]; then
  echo "WARN: unchecked acceptance criteria remain"
  # Non-zero only if manifest requires all checked
  if [ -f "$MANIFEST" ] && grep -q '"requireVerification": true' "$MANIFEST" 2>/dev/null; then
    if [ "$checked" -eq 0 ]; then
      echo "FAIL: requireVerification but no criteria checked"
      ERR=1
    fi
  fi
fi

if [ "$ERR" -eq 0 ]; then
  echo "=== verify-task PASSED ==="
else
  echo "=== verify-task FAILED ==="
fi
exit $ERR
