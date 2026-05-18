#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${AEGIS_WORKSPACE:-$HOME/dev/Project/aegis-hackathon-kit}"
cd "$WORKSPACE"

TASK="${*:-status}"
STATUS_EXIT=0

echo "=== Real Hermes Bridge ==="
echo "Workspace: $(pwd)"
echo "Task: $TASK"
echo

if ! command -v hermes >/dev/null 2>&1; then
  echo "ERROR: real Hermes CLI not found."
  exit 1
fi

echo "Hermes binary: $(command -v hermes)"
echo

case "$TASK" in
  status)
    hermes gateway status || STATUS_EXIT=1
    echo
    echo "Hermes config check:"
    hermes config check || STATUS_EXIT=1
    echo
    echo "Hermes config path:"
    hermes config path || STATUS_EXIT=1
    ;;
  commands)
    hermes --help
    ;;
  model)
    hermes model
    ;;
  gateway-logs)
    journalctl --user -u hermes-gateway -n 80 --no-pager -l || STATUS_EXIT=1
    ;;
  *)
    echo "Trying real Hermes CLI with task text..."
    echo "If this fails, Hermes probably has no provider configured."
    hermes "$TASK" || STATUS_EXIT=1
    ;;
esac

exit "$STATUS_EXIT"
