#!/usr/bin/env bash
# Idempotent: plan.md all-agent wave per 2026-05-21_001200-orchestrate-plan-md-all-agents-handoff-pabti.md
set -euo pipefail
echo "aegis-kanban-seed-planmd-wave: disabled legacy product automation" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

BOARD="${AEGIS_KANBAN_BOARD:-aegis-hackathon}"
WORKSPACE="dir:${AEGIS_RPC_ROOT}"
WAVE="20260521"
PLAN_ORCH=".hermes/plans/2026-05-21_001200-orchestrate-plan-md-all-agents-handoff-pabti.md"
EPIC_KEY="planmd-wave-${WAVE}-epic"

if ! command -v hermes >/dev/null 2>&1; then
  echo "ERROR: hermes CLI not in PATH" >&2
  exit 1
fi

create_task() {
  local key="$1" title="$2" assignee="$3" body="$4" parent="${5:-}"
  local args=(--board "$BOARD" create "$title" --idempotency-key "$key" --assignee "$assignee" --workspace "$WORKSPACE" --body "$body")
  if [ -n "$parent" ]; then
    args+=(--parent "$parent")
  fi
  hermes kanban "${args[@]}" 2>&1 || true
}

echo "=== Seeding plan.md all-agent wave on $BOARD ==="

epic_out="$(create_task "$EPIC_KEY" \
  "plan.md Wave — all-agent PABTI handoff" \
  "aegis-orchestrator" \
  "Plan: ${PLAN_ORCH} | plan.md: §1-26 via plan-chunks + HACKATHON.md cuts | Parent: (epic)

Epic owner: reconcile children, dispatch --max 2, wave demo gate, security review before close.
Read DECISIONS.md for push/deploy gates. No secrets in comments.

Close this epic when all children complete or block with reason.")"

echo "$epic_out"
EPIC_ID="$(echo "$epic_out" | awk '/Created|exists/ {print $2; exit}')"
if [ -z "$EPIC_ID" ]; then
  EPIC_ID="$(hermes kanban --board "$BOARD" list 2>/dev/null | awk '/plan.md Wave — all-agent/ {print $2; exit}')"
fi
if [ -z "$EPIC_ID" ]; then
  echo "WARN: could not resolve epic id — children may lack parent" >&2
  EPIC_ID=""
fi

PARENT_LINE="Parent: ${EPIC_ID:-<epic>}"

common_footer() {
  cat <<EOF

Handoff (mandatory):
1. Write timestamped sub-plan: aegis-rpc/.hermes/plans/YYYY-MM-DD_HHMMSS-<role>-<slug>.md
2. Comment orchestrator: line1=plan path, line2=ready to execute OR blocked on dependency
3. PABTI: Plan → Analyze → Build → Debug → Test → Integrate
4. Return: files, commands, SHA, demo impact, follow-ups
5. Close: hermes kanban complete OR kanban block (never silent exit)

Acceptance (baseline): forge test; npm run build --prefix apps/web; AEGIS_BASE_URL=http://127.0.0.1:3000 ./tests/curl-demo.sh
Out of scope: secrets in card; force-push main; autonomous push unless DECISIONS allowlist + human OK
EOF
}

# Orchestrator
create_task "planmd-${WAVE}-orchestrator" \
  "PABTI: Orchestrator — plan.md wave sequencing" \
  "aegis-orchestrator" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-aegis-orchestrator.md | plan.md: §18-19,§25-26 | ${PARENT_LINE}

Scope: ORCHESTRATOR.md, DECISIONS.md, Kanban hygiene, epic comments, dispatch cadence.
Verify gaps vs plan-chunks; do not re-scaffold. OpenSrc: orchestrator block in ../docs/research/agent-research-assignments.md
Dependencies: none (runs first among coordinators)
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-backend-rpc" \
  "PABTI: backend-rpc — §8 API gateway" \
  "aegis-backend-rpc" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-backend-rpc.md | plan.md: §8,§5 | ${PARENT_LINE}

Scope: apps/web/src/app/api/rpc/**, apps/web/src/app/api/preflight/**, ../docs/04-api-spec.md
OpenSrc: backend-rpc in ../docs/research/agent-research-assignments.md
Dependencies: policy-engine for preflight contract alignment
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-tx-decoder" \
  "PABTI: tx-decoder — §9 intents" \
  "aegis-tx-decoder" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-tx-decoder.md | plan.md: §9 | ${PARENT_LINE}

Scope: decoder packages under aegis-rpc (tx-decoder paths per repo)
OpenSrc: tx-decoder in ../docs/research/agent-research-assignments.md
Dependencies: backend-rpc routes
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-policy-engine" \
  "PABTI: policy-engine — §10 deterministic policy" \
  "aegis-policy-engine" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-policy-engine.md | plan.md: §10 | ${PARENT_LINE}

Scope: policy engine modules; BLOCK must include reasonCode; audit hook
OpenSrc: policy-engine in ../docs/research/agent-research-assignments.md
Dependencies: tx-decoder shapes
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-adapter" \
  "PABTI: adapter — §11 Chainlink + adapters" \
  "aegis-adapter" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-adapter.md | plan.md: §11 | ${PARENT_LINE}

Scope: adapter layer + contracts consumer wiring
OpenSrc: adapter in ../docs/research/agent-research-assignments.md
Dependencies: policy-engine verdict paths for stale feed demo
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-database" \
  "PABTI: database — §13 audit trail" \
  "aegis-database" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-database.md | plan.md: §13 | ${PARENT_LINE}

Scope: audit event persistence schema/API
OpenSrc: database in ../docs/research/agent-research-assignments.md
Dependencies: backend-rpc emits audit events
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-ai-memo" \
  "PABTI: ai-memo — §14 post-policy AI" \
  "aegis-ai-memo" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-ai-memo.md | plan.md: §14 | ${PARENT_LINE}

Scope: AI memo only AFTER policy verdict; fallback templates
OpenSrc: ai-memo in ../docs/research/agent-research-assignments.md
Dependencies: policy-engine (must not enforce via AI)
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-frontend" \
  "PABTI: frontend — §7 §21 demo UX" \
  "aegis-frontend" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-frontend.md | plan.md: §7,§21 | ${PARENT_LINE}
Detail: .hermes/plans/2026-05-20_202600-frontend-landing-reown-dashboard.md

Scope: apps/web/src/** (marketing vs app shell per Detail plan)
OpenSrc: frontend in ../docs/research/agent-research-assignments.md
Dependencies: API routes stable for demo
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-smart-contract" \
  "PABTI: smart-contract — §15 §17 on-chain" \
  "aegis-smart-contract" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-smart-contract.md | plan.md: §15,§17 | ${PARENT_LINE}

Scope: aegis-rpc/contracts/**
OpenSrc: smart-contract in ../docs/research/agent-research-assignments.md
Dependencies: adapter contracts alignment
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-qa" \
  "PABTI: qa — §20 §21 demo gate" \
  "aegis-qa" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-qa.md | plan.md: §20,§21 | ${PARENT_LINE}

Scope: tests/curl-demo.sh, regression notes, AI_COLLABORATION_LOG row if fixes land
OpenSrc: qa in ../docs/research/agent-research-assignments.md
Dependencies: vertical slices above
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-pitch" \
  "PABTI: pitch — §2 §24 judge narrative" \
  "aegis-pitch" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-pitch.md | plan.md: §2,§24 | ${PARENT_LINE}

Scope: README, pitch docs, demo script alignment
OpenSrc: pitch in ../docs/research/agent-research-assignments.md
Dependencies: qa demo gate green
$(common_footer)" \
  "$EPIC_ID"

create_task "planmd-${WAVE}-security" \
  "PABTI: security review — cross-cutting gate" \
  "aegis-security" \
  "Plan: .hermes/plans/2026-05-20_174800-agent-security-review.md | plan.md: §10-15 | ${PARENT_LINE}

Scope: read-only review; report findings; no broad refactors
OpenSrc: security in ../docs/research/agent-research-assignments.md
Dependencies: run after implementation children or parallel read-only deltas
$(common_footer)" \
  "$EPIC_ID"

# Devops: verify-only if deploy summary exists
if [ -f "${AEGIS_RPC_ROOT}/.hermes/deploy/latest-summary.txt" ]; then
  create_task "planmd-${WAVE}-devops-d3-verify" \
    "PABTI: devops — D3 verify on-chain (post-script deploy)" \
    "aegis-devops" \
    "Plan: .hermes/plans/2026-05-20_174800-agent-aegis-orchestrator.md | plan.md: §17 D3 | ${PARENT_LINE}

VERIFY ONLY — deploy via scripts/aegis-d3-deploy-once.sh already ran. Read .hermes/deploy/latest-summary.txt.
Confirm onChainPolicyHash in preflight/curl-demo. No forge keys in worker.
$(common_footer)" \
    "$EPIC_ID"
fi

# Hermes: child tasks stay todo until parent epic completes; complete epic as container (no product diff).
if [ -n "$EPIC_ID" ]; then
  hermes kanban --board "$BOARD" complete "$EPIC_ID" \
    --summary "Epic container: planmd-wave-${WAVE} children seeded; workers claim ready children." 2>/dev/null || true
fi

echo
hermes kanban --board "$BOARD" stats 2>/dev/null || true
echo
echo "Dispatch: hermes kanban --board $BOARD dispatch --max 2"
echo "Or: scripts/aegis-pm-orchestrate-once.sh"
