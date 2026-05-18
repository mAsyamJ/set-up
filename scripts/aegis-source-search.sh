#!/usr/bin/env bash
set -Eeuo pipefail

mkdir -p research/notes
OUT="research/notes/source-research-results.md"

read_path() {
  local f="$1"
  [[ -f "$f" ]] && cat "$f" || true
}

section() {
  echo ""
  echo "## $1"
  echo ""
}

{
  echo "# Aegis Source Research Results"
  echo ""
  echo "Generated: $(date -Iseconds)"
  echo ""

  section "Cached OpenSrc paths"
  find research/opensrc-paths -type f -name "*.path" -maxdepth 1 -print 2>/dev/null | sort | while read -r f; do
    echo "- $(basename "$f"): $(cat "$f")"
  done

  section "viem: decode, read, call, transaction patterns"
  P="$(read_path research/opensrc-paths/viem.path)"
  [[ -n "$P" ]] && rg -n "decodeFunctionData|parseTransaction|serializeTransaction|readContract|publicClient.call|sendRawTransaction" "$P" || true

  section "Next.js: route handler patterns"
  P="$(read_path research/opensrc-paths/next.path)"
  [[ -n "$P" ]] && rg -n "export async function POST|Route Handler|NextRequest|NextResponse" "$P" || true

  section "Zod: request validation patterns"
  P="$(read_path research/opensrc-paths/zod.path)"
  [[ -n "$P" ]] && rg -n "safeParse|ZodError|z.object" "$P" || true

  section "Chainlink: AggregatorV3Interface patterns"
  F="$(find research/opensrc-paths -maxdepth 1 -type f -name "at_chainlink__contracts.path" -o -name "at_chainlinkcontracts.path" | head -1 || true)"
  P="$(read_path "$F")"
  [[ -n "$P" ]] && rg -n "AggregatorV3Interface|latestRoundData|decimals|updatedAt" "$P" || true

  section "OpenZeppelin: ERC20 approval and ownership patterns"
  F="$(find research/opensrc-paths -maxdepth 1 -type f -name "at_openzeppelin__contracts.path" -o -name "at_openzeppelincontracts.path" | head -1 || true)"
  P="$(read_path "$F")"
  [[ -n "$P" ]] && rg -n "function approve|allowance|IERC20|Approval|Ownable|AccessControl" "$P" || true

  section "Ethereum execution APIs: JSON-RPC transaction methods"
  rg -n "eth_sendRawTransaction|eth_call|eth_getBalance|JSON-RPC|Transaction" research/repos/ethereum__execution-apis 2>/dev/null || true

  section "RPC endpoint architecture"
  rg -n "rpc|json-rpc|eth_sendRawTransaction|proxy|forward" research/repos/flashbots__rpc-endpoint 2>/dev/null || true

  section "Transaction preview / wallet risk UX"
  rg -n "simulation|simulate|preview|approve|approval|allowance|spender|risk|warning" \
    research/repos/Tenderly__tenderly-rabby-transaction-preview \
    research/repos/wallet-guard__wallet-guard-extension \
    research/repos/RabbyHub__Rabby 2>/dev/null || true

  section "Account abstraction stretch research"
  rg -n "UserOperation|EntryPoint|eth_sendUserOperation|sendUserOperation" \
    research/repos/eth-infinitism__account-abstraction \
    research/repos/eth-infinitism__bundler-spec \
    research/repos/pimlicolabs__permissionless.js 2>/dev/null || true

  section "Safe treasury stretch research"
  rg -n "proposeTransaction|confirmTransaction|SafeTransaction|transactionService" \
    research/repos/safe-global__safe-core-sdk \
    research/repos/safe-global__safe-transaction-service 2>/dev/null || true

} > "$OUT"

echo "Wrote $OUT"
