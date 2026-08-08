#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" != "--apply" ] || [[ "${2:-}" != "operator" && "${2:-}" != "worker" ]]; then
  echo "Usage: configure-hermes-harness-profiles.sh --apply {operator|worker}" >&2
  echo "This command does not configure credentials, start Hermes, or enable a service." >&2
  exit 2
fi

MODE="$2"
HARNESS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node)"
HERMES_BIN="$(command -v hermes)"

[ -x "$NODE_BIN" ] || { echo "Node executable missing" >&2; exit 2; }
[ -x "$HERMES_BIN" ] || { echo "Hermes executable missing" >&2; exit 2; }

if [ "$MODE" = "operator" ]; then
  PROFILE="harnessop"
  ENTRYPOINT="${HARNESS_ROOT}/dist/runtime/mcp/harness-mcp-server/src/entrypoints/hermes-operator.js"
  DESCRIPTION="Least-privilege Agent Harness operator; read-only plus gated task proposal."
else
  PROFILE="harnessworker"
  ENTRYPOINT="${HARNESS_ROOT}/dist/runtime/mcp/harness-mcp-server/src/entrypoints/hermes-worker.js"
  DESCRIPTION="Ephemeral lease-scoped Agent Harness disposable canary worker."
fi

[ -f "$ENTRYPOINT" ] || { echo "Build output missing; run the green baseline first" >&2; exit 2; }
if hermes profile list | awk '{print $1}' | grep -qx "$PROFILE"; then
  echo "Profile already exists: $PROFILE" >&2
  exit 2
fi

hermes profile create "$PROFILE" --no-skills --description "$DESCRIPTION"

disabled=(
  browser clarify code_execution computer_use context_engine cronjob delegation
  file homeassistant image_gen memory session_search skills spotify terminal todo
  tts video video_gen vision web x_search yuanbao
)
"$PROFILE" tools disable --platform cli "${disabled[@]}"

if [ "$MODE" = "operator" ]; then
  "$PROFILE" mcp add harness \
    --command "$NODE_BIN" \
    --connect-timeout 15 \
    --args "$ENTRYPOINT"
else
  "$PROFILE" mcp add harness \
    --command "$NODE_BIN" \
    --connect-timeout 15 \
    --env \
      'HARNESS_WORKER_ID=${HARNESS_WORKER_ID}' \
      'HARNESS_WORKER_PROJECT_ID=${HARNESS_WORKER_PROJECT_ID}' \
      'HARNESS_WORKER_WORKTREE=${HARNESS_WORKER_WORKTREE}' \
      'HARNESS_WORKER_LEASE_TOKEN=${HARNESS_WORKER_LEASE_TOKEN}' \
    --args "$ENTRYPOINT"
fi

echo
echo "Created $PROFILE without credentials or services."
echo "Configure this profile's provider/model explicitly:"
echo "  $PROFILE model"
echo "Verify the server-side allowlist and optionally apply a second Hermes-side filter:"
echo "  $PROFILE mcp configure harness"
echo "Foreground sessions must use: --toolsets mcp-harness"
