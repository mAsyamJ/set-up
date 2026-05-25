#!/usr/bin/env bash
# Script-only Base Sepolia deploy (no LLM). Requires DECISIONS D3 approval + DEPLOYER_PRIVATE_KEY in local env.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"
# shellcheck source=lib/decisions-gate.sh
source "${SCRIPT_DIR}/lib/decisions-gate.sh"

RPC_ROOT="${AEGIS_RPC_ROOT}"
CONTRACTS="${RPC_ROOT}/contracts"
DEPLOY_DIR="${RPC_ROOT}/.hermes/deploy"
SUMMARY="${DEPLOY_DIR}/latest-summary.txt"
STAMP="$(date -u '+%Y%m%dT%H%M%SZ')"

if ! aegis_decisions_d3_approved; then
  echo "aegis-d3-deploy-once: D3 not approved in DECISIONS.md — skip"
  exit 0
fi

if [ -f "${RPC_ROOT}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${RPC_ROOT}/.env"
  set +a
fi
if [ -f "${CONTRACTS}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${CONTRACTS}/.env"
  set +a
fi

if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ]; then
  echo "aegis-d3-deploy-once: DEPLOYER_PRIVATE_KEY not set (use aegis-rpc/.env or contracts/.env — never Kanban/Telegram)" >&2
  exit 1
fi

export BASE_SEPOLIA_RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"
export DEPLOYER_PRIVATE_KEY

mkdir -p "$DEPLOY_DIR"

if ! command -v forge >/dev/null 2>&1; then
  echo "aegis-d3-deploy-once: forge not in PATH" >&2
  exit 2
fi

echo "aegis-d3-deploy-once: broadcasting DeployBaseSepolia (Base Sepolia)"
cd "$CONTRACTS"

LOG="${DEPLOY_DIR}/forge-${STAMP}.log"
set +e
VERIFY_FLAG=()
if [ -n "${ETHERSCAN_API_KEY:-}" ] || [ -n "${BASESCAN_API_KEY:-}" ]; then
  VERIFY_FLAG=(--verify)
fi
forge script script/DeployBaseSepolia.s.sol:DeployBaseSepolia \
  --rpc-url base_sepolia \
  --broadcast \
  "${VERIFY_FLAG[@]}" \
  -vvv 2>&1 | tee "$LOG"
rc=${PIPESTATUS[0]}
set -e

{
  echo "# D3 deploy summary — ${STAMP}"
  echo "chain: Base Sepolia (84532)"
  echo "script: contracts/script/DeployBaseSepolia.s.sol"
  echo "forge_exit: $rc"
  echo
  echo "## Logged addresses (from script console)"
  grep -E 'AegisPolicyRegistry|ChainlinkFeedConsumer|DemoERC20|DemoSpender|AgentUseCasePolicyApp|DeFiUseCasePolicyApp|RWAUseCasePolicyApp' "$LOG" 2>/dev/null || true
  echo
  echo "full_log: $LOG"
} > "$SUMMARY"

if [ "$rc" -ne 0 ]; then
  echo "aegis-d3-deploy-once: forge failed (see $LOG)" >&2
  exit 2
fi

# Best-effort: refresh deployments stub for app consumers
if command -v python3 >/dev/null 2>&1; then
  python3 - "$LOG" "${RPC_ROOT}/contracts/deployments/base-sepolia.json" <<'PY' 2>/dev/null || true
import json, re, sys, datetime
log_path, out_path = sys.argv[1], sys.argv[2]
text = open(log_path, encoding="utf-8", errors="replace").read()
addrs = {}
for line in text.splitlines():
    m = re.search(
        r"(AegisPolicyRegistry|ChainlinkFeedConsumer|DemoERC20|DemoSpender|AgentUseCasePolicyApp|DeFiUseCasePolicyApp|RWAUseCasePolicyApp)\s+(0x[a-fA-F0-9]{40})",
        line,
    )
    if m:
        addrs[m.group(1)] = m.group(2)
if addrs:
    payload = {"baseSepolia": addrs, "updatedAt": datetime.datetime.utcnow().isoformat() + "Z"}
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")
PY
fi

echo "aegis-d3-deploy-once: OK — summary at $SUMMARY"
exit 0
