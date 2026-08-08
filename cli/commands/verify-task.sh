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

# Run verification keys from task frontmatter or default set
VERIFY_KEYS="typecheck test smoke"
if grep -q '^verification:' "$TASK" 2>/dev/null; then
  VERIFY_KEYS="$(awk '/^verification:/{f=1;next} f&&/^  - /{gsub(/^  - /,""); print; next} f&&/^[^ ]/{exit}' "$TASK" | tr '\n' ' ')"
fi

[ -f "$MANIFEST" ] || { echo "FAIL: missing $MANIFEST" >&2; exit 1; }
VERIFY_JSON="$(python3 -c '
import json, sys
print(json.dumps({"commands": sys.argv[1:]}))
' $VERIFY_KEYS)"
echo "--- trusted verification commands: $VERIFY_KEYS ---"
if ! HARNESS_GATEWAY_PROFILE=cursor-interactive \
  "$AGENT_HARNESS_HOME/cli/harness" run-task "$PROJECT" verify.run "$VERIFY_JSON"; then
  ERR=1
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
