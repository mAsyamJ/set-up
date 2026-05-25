#!/usr/bin/env bash
# Hermes cron: 10-minute PM status for aegis-hackathon (no LLM). Deliver via --no-agent cron.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT_ROOT="${AGENT_HARNESS_HOME:-${AEGIS_REPO_ROOT:-$HOME/dev/Project/agent-harness}}"
LIB_DIR="${SCRIPT_DIR}/lib"
if [ ! -f "${LIB_DIR}/paths.sh" ]; then
  LIB_DIR="${KIT_ROOT}/scripts/lib"
fi
# shellcheck source=lib/paths.sh
source "${LIB_DIR}/paths.sh"
# shellcheck source=lib/decisions-gate.sh
source "${LIB_DIR}/decisions-gate.sh"
# shellcheck source=lib/project-manifest.sh
source "${LIB_DIR}/project-manifest.sh"
KIT="${AEGIS_REPO_ROOT}"
RPC="${AEGIS_RPC_ROOT}"
BRIDGE_BASE="${KIRO_BRIDGE_URL:-http://127.0.0.1:8787}"
BRIDGE_BASE="${BRIDGE_BASE%/}"
BRIDGE_URL="${BRIDGE_BASE}/health"
BOARD="${AEGIS_KANBAN_BOARD:-aegis-hackathon}"
GATEWAY_STATE="${HOME}/.hermes/gateway_state.json"
PLAN_REF="projects/aegis-rpc/docs/plan.md + .hermes/plans/2026-05-20_201500-headless-pm-pabti-orchestrate-agent-github-10m.md"

# rg if present, else grep (WSL/minimal hosts)
kb_filter() {
  if command -v rg >/dev/null 2>&1; then rg "$@"; else grep -E "$@"; fi
}
kb_count_blocked() {
  if command -v rg >/dev/null 2>&1; then rg -c 'blocked' || echo 0; else grep -c blocked || echo 0; fi
}

utc_now="$(date -u '+%Y-%m-%d %H:%M UTC')"

echo "=== Aegis PM status — $utc_now ==="
echo "Scope: fleet registry + $PLAN_REF"
echo

if command -v hermes >/dev/null 2>&1; then
  echo "=== Fleet Kanban (all registry boards) ==="
  while IFS= read -r board; do
    [ -n "$board" ] || continue
    echo "--- board: $board ---"
    hermes kanban --board "$board" stats 2>/dev/null || echo "WARN: stats failed for $board"
  done < <(list_registry_kanban_boards | sort -u)
  echo
fi

echo "Active board (AEGIS_KANBAN_BOARD): ${BOARD}"
if command -v hermes >/dev/null 2>&1; then
  hermes kanban --board "$BOARD" stats 2>/dev/null || echo "WARN: kanban stats failed"
  echo
  echo "Running (if any):"
  hermes kanban --board "$BOARD" list 2>/dev/null | kb_filter 'running' || echo "  (none)"
  echo "Ready (if any):"
  hermes kanban --board "$BOARD" list 2>/dev/null | kb_filter 'ready' || echo "  (none)"
  echo "Blocked count:"
  hermes kanban --board "$BOARD" list 2>/dev/null | kb_count_blocked || echo "  0"
else
  echo "WARN: hermes CLI not in PATH"
fi
echo

if [ -f "$GATEWAY_STATE" ] && command -v python3 >/dev/null 2>&1; then
  python3 -c "
import json
d = json.load(open('${GATEWAY_STATE}'))
tg = d.get('platforms', {}).get('telegram', {})
print('Telegram gateway:', tg.get('state', 'unknown'))
" 2>/dev/null || echo "Telegram gateway: unknown"
else
  echo "Telegram gateway: (no gateway_state.json)"
fi

if [ -x "${KIT}/scripts/aegis-secrets-health.sh" ]; then
  "${KIT}/scripts/aegis-secrets-health.sh" 2>/dev/null || echo "Credentials: check failed"
fi
echo

echo "Stack:"
if curl -sf --max-time 8 "$BRIDGE_URL" >/dev/null 2>&1; then
  echo "OK   bridge $BRIDGE_URL"
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "
import json, urllib.request
d = json.load(urllib.request.urlopen('$BRIDGE_URL'))
c = d.get('providers', {}).get('cursor', {})
print('  defaultModel:', d.get('defaultModel'))
print('  cursor bridgeMode:', c.get('bridgeMode'), 'configured:', c.get('configured'))
" 2>/dev/null || true
  fi
else
  echo "FAIL bridge $BRIDGE_URL — run: $KIT/scripts/fix-hermes-telegram-gate.sh"
fi
if systemctl --user is-active --quiet hermes-gateway.service 2>/dev/null; then
  echo "OK   hermes-gateway active"
else
  echo "FAIL hermes-gateway not active"
fi
if systemctl --user is-active --quiet kiro-openai-bridge.service 2>/dev/null; then
  echo "OK   kiro-openai-bridge active"
else
  echo "FAIL kiro-openai-bridge not active"
fi
if systemctl --user is-active --quiet aegis-kanban-dispatch.timer 2>/dev/null; then
  echo "OK   aegis-kanban-dispatch.timer active (Lane O orchestrate + dispatch)"
else
  echo "     aegis-kanban-dispatch.timer inactive (optional)"
fi
echo

if [ -d "$RPC/.git" ]; then
  echo "Repo: $(git -C "$RPC" rev-parse --short HEAD 2>/dev/null || echo '?') @ $RPC"
  echo
fi

echo "Gates (unchanged unless worker ran in last 10m):"
if [ -d "$RPC/apps/web" ]; then
  echo "  dev: cd $RPC/apps/web && npm run dev"
  echo "  curl-demo: AEGIS_BASE_URL=http://127.0.0.1:3000 $RPC/tests/curl-demo.sh"
else
  echo "  (aegis-rpc apps/web missing)"
fi
echo

echo "Blockers / policy:"
if aegis_decisions_d3_approved; then
  if [ -f "${RPC}/.hermes/deploy/latest-summary.txt" ] && grep -q 'forge_exit: 0' "${RPC}/.hermes/deploy/latest-summary.txt" 2>/dev/null; then
    echo "  - D3 (t_481e57d1): approved — deploy summary present; devops verify worker"
  else
    echo "  - D3 (t_481e57d1): approved in DECISIONS — run scripts/aegis-d3-deploy-once.sh (DEPLOYER_PRIVATE_KEY in local .env)"
  fi
else
  echo "  - D3 (t_481e57d1): approval-gated in DECISIONS.md"
fi
if aegis_decisions_push_allowlist_active; then
  echo "  - Git push: allowlist ACTIVE until $(aegis_decisions_push_allowlist_until) (see DECISIONS.md)"
else
  echo "  - Git push: default human OK per wave (DECISIONS.md)"
fi
echo "  - Lane O: scripts/aegis-pm-orchestrate-once.sh (15m timer with dispatch)"
echo "  - Secrets: scripts/aegis-secrets-maintain.sh (authorized ~/.hermes/.env only)"
echo

echo "Next actions:"
if hermes kanban --board "$BOARD" list 2>/dev/null | kb_filter -q 'ready'; then
  echo "  1. Wait for aegis-kanban-dispatch.timer OR: hermes kanban --board $BOARD dispatch --max 2"
else
  echo "  1. scripts/aegis-pm-orchestrate-once.sh (sync D3 + seed + dispatch)"
fi
echo "  2. Kanban workers use Cursor bridge (agent mode); PM cron is status-only"
echo "  3. Reply in Telegram to steer — no /reset needed"
