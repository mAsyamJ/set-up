#!/usr/bin/env bash
# Switch Hermes bridge default provider (Kiro vs Cursor).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

usage() {
  cat <<EOF
Usage: aegis-model.sh <status|kiro|cursor|codex>

  status   Show active bridge provider
  kiro     Switch to kiro-current (kiro-cli)
  cursor   Switch to cursor-composer-2 (headless Cursor Agent; agent login or CURSOR_API_KEY)
  codex    Switch to openai-codex (local Codex CLI via ChatGPT login)

After switching in Telegram, run /reset for a clean session.
EOF
}

cmd="${1:-status}"

case "$cmd" in
  status)
    curl -sf "${KIRO_BRIDGE_URL}/v1/admin/provider"
    echo
    ;;
  kiro)
    curl -sf -X POST "${KIRO_BRIDGE_URL}/v1/admin/provider" \
      -H "Content-Type: application/json" \
      -d '{"provider":"kiro-current","updatedBy":"cli"}'
    echo
    ;;
  cursor)
    curl -sf -X POST "${KIRO_BRIDGE_URL}/v1/admin/provider" \
      -H "Content-Type: application/json" \
      -d '{"provider":"cursor-composer-2","updatedBy":"cli"}'
    echo
    ;;
  codex)
    curl -sf -X POST "${KIRO_BRIDGE_URL}/v1/admin/provider" \
      -H "Content-Type: application/json" \
      -d '{"provider":"openai-codex","updatedBy":"cli"}'
    echo
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage >&2
    exit 1
    ;;
esac
