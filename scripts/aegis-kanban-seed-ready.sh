#!/usr/bin/env bash
# Idempotent: create ready PABTI tasks on aegis-hackathon when board has no ready work.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

BOARD="${AEGIS_KANBAN_BOARD:-aegis-hackathon}"
WORKSPACE="dir:${AEGIS_RPC_ROOT}"

if ! command -v hermes >/dev/null 2>&1; then
  echo "ERROR: hermes CLI not in PATH" >&2
  exit 1
fi

ready="$(hermes kanban --board "$BOARD" stats 2>/dev/null | awk '$1 == "ready" { print $2; exit }')"
ready="${ready:-0}"
if [ "$ready" -gt 0 ] 2>/dev/null; then
  echo "Board $BOARD already has ready=$ready — skip seed"
  exit 0
fi

seed_one() {
  local key="$1"
  local title="$2"
  local assignee="$3"
  local body="$4"
  local out
  out="$(hermes kanban --board "$BOARD" create "$title" \
    --idempotency-key "$key" \
    --assignee "$assignee" \
    --workspace "$WORKSPACE" \
    --body "$body" 2>&1)" || true
  echo "$out"
}

echo "Seeding ready tasks on board $BOARD (workspace $WORKSPACE)"

seed_one "aegis-pabti-qa-baseline-20260520" \
  "PABTI: QA baseline — forge, build, curl-demo" \
  "aegis-qa" \
  "Plan: .hermes/plans/2026-05-20_201500-headless-pm-pabti-orchestrate-agent-github-10m.md
PABTI: Plan → Analyze → Build → Test → Integrate.
Acceptance: cd aegis-rpc/contracts && forge test; npm run build --prefix apps/web; AEGIS_BASE_URL=http://127.0.0.1:3000 ./tests/curl-demo.sh (align port with actual dev server). Log one row in docs/AI_COLLABORATION_LOG.md. Close with kanban_complete (commands + SHAs) or kanban_block with reason. No secrets in card; no git push without human approval."

seed_one "aegis-pabti-frontend-landing-20260520" \
  "PABTI: Frontend landing vs app shell (Reown)" \
  "aegis-frontend" \
  "Plan: .hermes/plans/2026-05-20_202600-frontend-landing-reown-dashboard.md
PABTI: Split (marketing) layout vs AppShell for /dashboard, /demo, etc. Minimal diff; npm run build green. NEXT_PUBLIC_* only in .env.local — never Kanban/Telegram secrets. kanban_complete or kanban_block."

seed_one "aegis-pabti-orchestrator-hygiene-20260520" \
  "PABTI: Orchestrator hygiene — D3 gate + DECISIONS push policy" \
  "aegis-orchestrator" \
  "Plan: .hermes/plans/2026-05-20_201500-headless-pm-pabti-orchestrate-agent-github-10m.md
Confirm t_481e57d1 stays blocked (D3 deploy). Document push-allow state in aegis-rpc/DECISIONS.md (inactive template OK). No deploy keys in repo. kanban_complete with summary only."

echo
hermes kanban --board "$BOARD" stats 2>/dev/null || true
echo
echo "Dispatch workers (or wait for aegis-kanban-dispatch.timer):"
echo "  hermes kanban --board $BOARD dispatch --max 2"
