#!/usr/bin/env bash
# Lane O: headless PM loop — DECISIONS sync, D3 script deploy, backlog seed, dispatch (no gateway LLM).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"
# shellcheck source=lib/decisions-gate.sh
source "${SCRIPT_DIR}/lib/decisions-gate.sh"
# shellcheck source=lib/project-manifest.sh
source "${SCRIPT_DIR}/lib/project-manifest.sh"

BOARD="${AEGIS_KANBAN_BOARD:-aegis-hackathon}"
D3_TASK="t_481e57d1"
SUMMARY="${AEGIS_RPC_ROOT}/.hermes/deploy/latest-summary.txt"
VERIFY_BODY="VERIFY ONLY — deploy ran via scripts/aegis-d3-deploy-once.sh (do NOT run forge with keys).
Read: aegis-rpc/.hermes/deploy/latest-summary.txt
Confirm onChainPolicyHash via preflight/curl-demo. Update deployments/base-sepolia.json consumers if needed.
End with: hermes kanban complete ${D3_TASK} --summary '...' OR kanban block with reason."

echo "=== aegis-pm-orchestrate-once ==="

if [ -x "${SCRIPT_DIR}/aegis-secrets-health.sh" ]; then
  health="$("${SCRIPT_DIR}/aegis-secrets-health.sh" 2>/dev/null || true)"
  echo "$health"
  if echo "$health" | grep -q 'cursor=MISSING'; then
    echo "aegis-pm-orchestrate-once: cursor MISSING — skip dispatch" >&2
    exit 0
  fi
fi

BRIDGE_BASE="${KIRO_BRIDGE_URL:-http://127.0.0.1:8787}"
BRIDGE_BASE="${BRIDGE_BASE%/}"
if ! curl -sf --max-time 8 "${BRIDGE_BASE}/health" >/dev/null 2>&1; then
  echo "aegis-pm-orchestrate-once: bridge unhealthy — skip" >&2
  exit 0
fi

if ! command -v hermes >/dev/null 2>&1; then
  echo "aegis-pm-orchestrate-once: hermes not in PATH" >&2
  exit 0
fi

# Reclaim stuck D3 worker runs (aegis-rpc board only)
if [ "$BOARD" = "aegis-hackathon" ]; then
hermes kanban --board "$BOARD" reclaim "$D3_TASK" 2>/dev/null || true

d3_status="$(hermes kanban --board "$BOARD" show "$D3_TASK" 2>/dev/null | awk '/^[[:space:]]*status:/ {print $2; exit}')"
d3_status="${d3_status:-unknown}"
echo "D3 $D3_TASK status: $d3_status"

if aegis_decisions_d3_approved; then
  if [ "$d3_status" = "blocked" ]; then
    echo "Unblocking $D3_TASK (DECISIONS approved)"
    hermes kanban --board "$BOARD" unblock "$D3_TASK" 2>/dev/null || true
    d3_status="ready"
  fi

  if [ ! -f "$SUMMARY" ] || ! grep -q 'forge_exit: 0' "$SUMMARY" 2>/dev/null; then
    echo "Running script-only D3 deploy..."
    set +e
    "${SCRIPT_DIR}/aegis-d3-deploy-once.sh"
    deploy_rc=$?
    set -e
    if [ "$deploy_rc" -eq 1 ]; then
      hermes kanban --board "$BOARD" block "$D3_TASK" \
        "DEPLOYER_PRIVATE_KEY not in local env (aegis-rpc/.env). DECISIONS approved; set key on disk only." 2>/dev/null || true
      echo "D3 blocked: missing deploy key"
    elif [ "$deploy_rc" -eq 2 ]; then
      hermes kanban --board "$BOARD" block "$D3_TASK" \
        "forge deploy failed — see aegis-rpc/.hermes/deploy/ logs" 2>/dev/null || true
      echo "D3 blocked: forge failed"
    elif [ "$deploy_rc" -eq 0 ] && [ -f "$SUMMARY" ]; then
      hermes kanban --board "$BOARD" comment "$D3_TASK" \
        "Deploy script OK. ${VERIFY_BODY}" 2>/dev/null || true
      hermes kanban --board "$BOARD" unblock "$D3_TASK" 2>/dev/null || true
      echo "D3 deploy done — card ready for aegis-devops verify worker"
    fi
  else
    echo "D3 deploy summary already present — skip redeploy"
    hermes kanban --board "$BOARD" unblock "$D3_TASK" 2>/dev/null || true
    hermes kanban --board "$BOARD" comment "$D3_TASK" \
      "Deploy summary exists. ${VERIFY_BODY}" 2>/dev/null || true
  fi
fi
fi

ready="$(hermes kanban --board "$BOARD" stats 2>/dev/null | awk '$1 == "ready" { print $2; exit }')"
running="$(hermes kanban --board "$BOARD" stats 2>/dev/null | awk '$1 == "running" { print $2; exit }')"
ready="${ready:-0}"
running="${running:-0}"
blocked="$(hermes kanban --board "$BOARD" stats 2>/dev/null | awk '$1 == "blocked" { print $2; exit }')"
blocked="${blocked:-0}"

if [ "$ready" -eq 0 ] && [ "$running" -eq 0 ] && [ "$blocked" -eq 0 ] && [ "$BOARD" = "aegis-hackathon" ]; then
  echo "Board idle — seed plan.md all-agent wave (idempotent)"
  "${SCRIPT_DIR}/aegis-kanban-seed-planmd-wave.sh" || true
  ready="$(hermes kanban --board "$BOARD" stats 2>/dev/null | awk '$1 == "ready" { print $2; exit }')"
  ready="${ready:-0}"
  if [ "$ready" -eq 0 ]; then
    echo "No planmd wave — seed stretch backlog"
    "${SCRIPT_DIR}/aegis-kanban-seed-plan-backlog.sh" || true
  fi
elif [ "$ready" -eq 0 ] && [ "$running" -eq 0 ] && [ "$blocked" -le 1 ]; then
  echo "Only D3 or single blocker — skip broad backlog seed"
fi

echo "Dispatch wave..."
if [ -n "${AEGIS_KANBAN_BOARD:-}" ]; then
  AEGIS_KANBAN_BOARD="$BOARD" "${SCRIPT_DIR}/aegis-kanban-dispatch-once.sh"
else
  unset AEGIS_KANBAN_BOARD
  "${SCRIPT_DIR}/aegis-kanban-dispatch-once.sh"
fi

# Same timer tick: extra dispatch waves when ready>0 and worker slots are free (hands-off drain).
# Hermes typically allows up to --max 2 concurrent runs; avoid stacking while running>=2.
extra_waves="${AEGIS_KANBAN_EXTRA_DISPATCH_WAVES:-4}"
wave_sleep="${AEGIS_KANBAN_WAVE_SLEEP_SEC:-45}"
if ! [[ "$extra_waves" =~ ^[0-9]+$ ]]; then
  extra_waves=4
fi
if [ "$extra_waves" -gt 0 ]; then
  for ((wave = 0; wave < extra_waves; wave++)); do
    sleep "$wave_sleep"
    ready="$(hermes kanban --board "$BOARD" stats 2>/dev/null | awk '$1 == "ready" { print $2; exit }')"
    running="$(hermes kanban --board "$BOARD" stats 2>/dev/null | awk '$1 == "running" { print $2; exit }')"
    ready="${ready:-0}"
    running="${running:-0}"
    if ! [[ "$ready" =~ ^[0-9]+$ && "$running" =~ ^[0-9]+$ ]]; then
      echo "aegis-pm-orchestrate-once: extra wave stop — could not parse stats"
      break
    fi
    if [ "$ready" -lt 1 ]; then
      echo "aegis-pm-orchestrate-once: extra wave stop — ready=$ready"
      break
    fi
    if [ "$running" -ge 2 ]; then
      echo "aegis-pm-orchestrate-once: extra wave stop — slots full (running=$running)"
      break
    fi
    echo "aegis-pm-orchestrate-once: extra dispatch wave $((wave + 1))/${extra_waves} (ready=$ready running=$running)"
    "${SCRIPT_DIR}/aegis-kanban-dispatch-once.sh" || true
  done
fi

hermes kanban --board "$BOARD" stats 2>/dev/null || true
echo "=== aegis-pm-orchestrate-once done ==="
