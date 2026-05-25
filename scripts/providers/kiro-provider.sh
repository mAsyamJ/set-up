#!/usr/bin/env bash
set -euo pipefail

export PATH="/home/asyam/.local/bin:/home/asyam/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/paths.sh
source "${SCRIPT_DIR}/../lib/paths.sh"
WORKSPACE="${AEGIS_WORKSPACE:-$AEGIS_RPC_ROOT}"

if [ -n "${1:-}" ]; then
  USER_PROMPT="$1"
elif [ ! -t 0 ]; then
  USER_PROMPT="$(cat)"
else
  echo "ERROR: missing prompt"
  exit 1
fi

if [ -z "$USER_PROMPT" ]; then
  echo "ERROR: missing prompt"
  exit 1
fi

cd "$WORKSPACE"

if ! command -v kiro-cli >/dev/null 2>&1; then
  echo "ERROR: kiro-cli not found on PATH (need /mnt/d/Kiro/bin or Kiro in PATH)" >&2
  exit 127
fi

WHOAMI_OUT="$(kiro-cli whoami 2>&1 || true)"
if printf '%s' "$WHOAMI_OUT" | grep -qi 'not logged in'; then
  echo "ERROR: Kiro not logged in. Run once: kiro-cli login (complete device code in browser), then retry." >&2
  exit 42
fi

ARGS=(
  chat
  --no-interactive
  --trust-all-tools
)

# Optional. Enable only after MCP works from systemd.
if [ "${KIRO_REQUIRE_MCP:-0}" = "1" ]; then
  ARGS+=(--require-mcp-startup)
fi

kiro-cli "${ARGS[@]}" "$USER_PROMPT"
