#!/usr/bin/env bash
# ARCHIVED: incomplete product-specific smoke script; do not execute.
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "== RPC passthrough =="
curl -s -X POST "$BASE_URL/api/rpc" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_blockNumber\",\"params\":[]}" | jq

echo "== Preflight placeholder =="
echo "Add tests/fixtures/unlimited-approval.json then run:"
echo "curl -s -X POST $BASE_URL/api/preflight -H Content-Type:"
