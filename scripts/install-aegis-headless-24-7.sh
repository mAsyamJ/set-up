#!/usr/bin/env bash
# One-shot: headless 24/7 PM (Telegram 10m status + gated Kanban dispatch + secrets health).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

echo "=== Headless Hermes 24/7 install ==="
echo "Plan: aegis-rpc/.hermes/plans/2026-05-20_201500-headless-pm-pabti-orchestrate-agent-github-10m.md"
echo

if command -v loginctl >/dev/null 2>&1; then
  loginctl enable-linger "$(whoami)" 2>/dev/null && echo "OK   loginctl enable-linger" || echo "WARN loginctl enable-linger failed"
fi

echo "=== 1. Telegram gate + stack ==="
"${SCRIPT_DIR}/fix-hermes-telegram-gate.sh"

echo
echo "=== 2. PM cron (10m, script-only) ==="
"${SCRIPT_DIR}/install-aegis-pm-cron-10m.sh"

echo
echo "=== 3. Lane O timer (~5m orchestrate + dispatch + optional extra waves) ==="
"${SCRIPT_DIR}/install-aegis-kanban-dispatch-timer.sh"
chmod +x "${SCRIPT_DIR}/aegis-pm-orchestrate-once.sh" \
  "${SCRIPT_DIR}/aegis-d3-deploy-once.sh" \
  "${SCRIPT_DIR}/aegis-kanban-seed-plan-backlog.sh" 2>/dev/null || true

echo
echo "=== 4. Secrets health ==="
chmod +x "${SCRIPT_DIR}/aegis-secrets-health.sh" "${SCRIPT_DIR}/aegis-secrets-maintain.sh" 2>/dev/null || true
"${SCRIPT_DIR}/aegis-secrets-health.sh" || true

echo
echo "=== Validation checklist ==="
echo "  [ ] Telegram: /set-home in bot DM (once)"
echo "  [ ] Within ~10m: PM status block (=== Aegis PM status ===)"
echo "  [ ] hermes cron list → one aegis-pm-tick-10m"
echo "  [ ] curl -sf http://127.0.0.1:8787/health → bridgeMode agent, configured true"
echo "  [ ] DEPLOYER_PRIVATE_KEY in aegis-rpc/.env for D3 script deploy"
echo "  [ ] Lane O: scripts/aegis-pm-orchestrate-once.sh (or wait for ~5m timer)"
echo "  [ ] journalctl --user -u aegis-kanban-dispatch.service -n 30"
echo "  [ ] WSL/VM must stay running; Windows sleep stops the stack"
echo
echo "Preview PM post: ~/.hermes/scripts/aegis-pm-tick-10m.sh"
