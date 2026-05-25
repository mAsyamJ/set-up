#!/usr/bin/env bash
# One-shot post harness upgrade: sync Hermes, index project, restart gateway
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"

PROJECT="${1:-$AEGIS_RPC_ROOT}"
PROJECT="$(cd "$PROJECT" && pwd)"

echo "=== post-harness-upgrade-sync ==="
"$AGENT_HARNESS_HOME/cli/harness" sync-hermes "$PROJECT"
"$AGENT_HARNESS_HOME/cli/harness" obsidian init "$PROJECT" 2>/dev/null || true
"$AGENT_HARNESS_HOME/cli/harness" index-project "$PROJECT"
"$AGENT_HARNESS_HOME/cli/harness" doctor "$PROJECT"

if command -v systemctl >/dev/null 2>&1; then
  systemctl --user restart hermes-gateway.service 2>/dev/null || true
  echo "OK: restarted hermes-gateway"
fi

echo "=== upgrade sync complete ==="
echo "Telegram: /reset then ask: What are your new harness capabilities?"
