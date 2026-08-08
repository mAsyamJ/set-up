#!/usr/bin/env bash
# Authenticate Cursor for Hermes bridge via `agent login` or CURSOR_API_KEY.
set -euo pipefail
echo "setup-cursor-bridge-auth: disabled legacy bridge credential flow" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

if grep -q '^CURSOR_API_KEY=.\+' "${HOME}/.hermes/.env" 2>/dev/null; then
  echo "CURSOR_API_KEY already set in ~/.hermes/.env"
  systemctl --user restart kiro-openai-bridge.service 2>/dev/null || true
  if [ -x "${AEGIS_REPO_ROOT}/scripts/smoke-cursor-bridge.sh" ]; then
    sleep 2
    "${AEGIS_REPO_ROOT}/scripts/smoke-cursor-bridge.sh" || true
  fi
  exit 0
fi

if command -v agent >/dev/null 2>&1 && agent status 2>&1 | grep -qv 'Not logged in'; then
  echo "Cursor agent already logged in."
  systemctl --user restart kiro-openai-bridge.service 2>/dev/null || true
  exit 0
fi

echo "Starting Cursor CLI login (complete sign-in in the browser that opens)..."
NO_OPEN_BROWSER="${NO_OPEN_BROWSER:-0}" agent login

if agent status 2>&1 | grep -qv 'Not logged in'; then
  echo "Login OK. Restarting bridge..."
  systemctl --user restart kiro-openai-bridge.service 2>/dev/null || true
  sleep 2
  curl -sf "${KIRO_BRIDGE_URL}/v1/admin/provider" || true
  echo
  if [ -x "${AEGIS_REPO_ROOT}/scripts/smoke-cursor-bridge.sh" ]; then
    echo "Running cursor bridge smoke..."
    "${AEGIS_REPO_ROOT}/scripts/smoke-cursor-bridge.sh" || true
  fi
  exit 0
fi

echo "Login failed. Retry: agent login" >&2
exit 1
