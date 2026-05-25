#!/usr/bin/env bash
# Full doc-10 acceptance per plan Wave 8
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"

TMP="${1:-/tmp/harness-accept-$$}"
rm -rf "$TMP"
mkdir -p "$TMP"

echo "=== harness acceptance ==="
cd "$AGENT_HARNESS_HOME"
npm install --silent
npm run build
npm test

cli/harness init-project "$TMP" demo-app
cli/harness doctor "$TMP/demo-app"
cli/harness obsidian init "$TMP/demo-app"
cli/harness index-project "$TMP/demo-app"
cli/harness new-task "$TMP/demo-app" "Audit architecture"
cli/harness run-task "$TMP/demo-app" project.inspect

timeout 2 cli/harness start-mcp </dev/null >/dev/null 2>&1 || true

npm run start-a2a >/tmp/harness-a2a.log 2>&1 &
A2A_PID=$!
sleep 1
curl -sf http://127.0.0.1:8790/.well-known/agent.json | head -c 200
echo
kill "$A2A_PID" 2>/dev/null || true
wait "$A2A_PID" 2>/dev/null || true

cli/harness smoke projects/aegis-rpc || true
scripts/harness-validation.sh projects/aegis-rpc

echo "=== acceptance PASSED ==="
