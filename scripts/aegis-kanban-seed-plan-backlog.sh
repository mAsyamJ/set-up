#!/usr/bin/env bash
# Idempotent: seed post-MVP / stretch ready tasks when board is idle (no ready/running).
set -euo pipefail
echo "aegis-kanban-seed-plan-backlog: disabled legacy product automation" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

BOARD="${AEGIS_KANBAN_BOARD:-aegis-hackathon}"
WORKSPACE="dir:${AEGIS_RPC_ROOT}"
D3_TASK="t_481e57d1"

if ! command -v hermes >/dev/null 2>&1; then
  echo "ERROR: hermes CLI not in PATH" >&2
  exit 1
fi

ready="$(hermes kanban --board "$BOARD" stats 2>/dev/null | awk '$1 == "ready" { print $2; exit }')"
running="$(hermes kanban --board "$BOARD" stats 2>/dev/null | awk '$1 == "running" { print $2; exit }')"
ready="${ready:-0}"
running="${running:-0}"

if [ "$ready" -gt 0 ] || [ "$running" -gt 0 ]; then
  echo "Board busy (ready=$ready running=$running) — skip plan backlog seed"
  exit 0
fi

# Do not flood backlog while D3 verify/deploy is the only open item
blocked="$(hermes kanban --board "$BOARD" list 2>/dev/null | grep -c 'blocked' || echo 0)"
if [ "$blocked" -gt 1 ] 2>/dev/null; then
  echo "Multiple blocked tasks — skip plan backlog seed"
  exit 0
fi

seed_one() {
  local key="$1" title="$2" assignee="$3" body="$4"
  hermes kanban --board "$BOARD" create "$title" \
    --idempotency-key "$key" \
    --assignee "$assignee" \
    --workspace "$WORKSPACE" \
    --body "$body" 2>&1 || true
}

echo "Seeding plan.md stretch backlog on $BOARD"

seed_one "aegis-backlog-pitch-judge-20260520" \
  "PABTI: Pitch + judge Q&A polish" \
  "aegis-pitch" \
  "Plan: kit-root plan.md §pitch + docs/15-demo-script.md. PABTI: tighten README judge path, demo talking points. kanban_complete or kanban_block. No secrets."

seed_one "aegis-backlog-github-pr-hygiene-20260520" \
  "PABTI: GitHub PR hygiene — feature branch + checks" \
  "aegis-orchestrator" \
  "Plan: DECISIONS.md push allowlist. Create feature branch, open PR, loop gh pr checks until green. No push to main. kanban_complete with PR URL or kanban_block."

hermes kanban --board "$BOARD" stats 2>/dev/null || true
