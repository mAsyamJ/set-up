#!/usr/bin/env bash
set -euo pipefail

export PATH="/home/asyam/.local/bin:/home/asyam/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

WORKSPACE="${AEGIS_WORKSPACE:-/home/asyam/dev/Project/aegis-hackathon-kit}"

USER_PROMPT="${1:-}"
if [ -z "$USER_PROMPT" ]; then
  echo "ERROR: missing prompt"
  exit 1
fi

cd "$WORKSPACE"

if ! command -v kiro-cli >/dev/null 2>&1; then
  echo "ERROR: kiro-cli not found on PATH (need /mnt/d/Kiro/bin or Kiro in PATH)" >&2
  exit 127
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
