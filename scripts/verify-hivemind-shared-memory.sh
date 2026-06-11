#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

pass() { printf "\033[32m[ok]\033[0m %s\n" "$*"; }
warn() { printf "\033[33m[warn]\033[0m %s\n" "$*"; }
fail() { printf "\033[31m[fail]\033[0m %s\n" "$*"; FAIL=1; }

FAIL=0

log() { printf "\033[36m[hivemind-verify]\033[0m %s\n" "$*"; }

log "Kit root: ${AEGIS_REPO_ROOT}"

if command -v hivemind >/dev/null 2>&1; then
  pass "hivemind CLI: $(hivemind 2>&1 | head -1 || true)"
  hivemind status 2>/dev/null | head -12 || warn "hivemind status failed"
else
  fail "hivemind CLI not on PATH (npm install -g @deeplake/hivemind)"
fi

for f in \
  "${HOME}/.cursor/hooks.json" \
  "${HOME}/.hermes/config.yaml" \
  "${HOME}/.codex/hooks.json"; do
  if [[ -f "$f" ]] && grep -q hivemind "$f" 2>/dev/null; then
    pass "hooks wired: $f"
  else
    warn "missing or no hivemind in: $f"
  fi
done

if [[ -f "${HOME}/.hivemind/mcp/server.js" ]]; then
  pass "Hivemind MCP server: ~/.hivemind/mcp/server.js"
else
  fail "Hivemind MCP server missing (~/.hivemind/mcp/server.js)"
fi

KIRO_MCP="${AEGIS_REPO_ROOT}/.kiro/settings/mcp.json"
if [[ -f "$KIRO_MCP" ]] && grep -q '"hivemind"' "$KIRO_MCP"; then
  pass "Kiro mcp.json includes hivemind"
else
  fail "Kiro .kiro/settings/mcp.json missing hivemind entry"
fi

if systemctl --user is-active --quiet hermes-gateway 2>/dev/null; then
  pass "hermes-gateway: active"
else
  warn "hermes-gateway: not active (run aegis-dev)"
fi

if systemctl --user is-active --quiet telegram-kiro-gateway 2>/dev/null; then
  fail "telegram-kiro-gateway: active (should be disabled; breaks shared memory)"
else
  pass "telegram-kiro-gateway: inactive (expected)"
fi

BRIDGE_CTX="${AEGIS_REPO_ROOT}/scripts/lib/hivemind-bridge-context.cjs"
if [[ -f "$BRIDGE_CTX" ]]; then
  pass "bridge context module present"
  node "$BRIDGE_CTX" | head -5 >/dev/null && pass "bridge context module runs"
else
  fail "missing $BRIDGE_CTX"
fi

WIKI_LOG="${HOME}/.hermes/hooks/deeplake-wiki.log"
if [[ -f "$WIKI_LOG" ]]; then
  if tail -20 "$WIKI_LOG" | grep -q "fatal: API 502"; then
    warn "recent wiki-worker 502 in deeplake-wiki.log (run diagnose-hivemind-capture.sh)"
  else
    pass "no recent fatal 502 in wiki log (last 20 lines)"
  fi
else
  warn "no wiki log yet: $WIKI_LOG"
fi

FETCH_JS="${AEGIS_REPO_ROOT}/scripts/lib/hivemind-deeplake-fetch.js"
if [[ -f "$FETCH_JS" ]]; then
  if CLOUD_OUT="$(node "$FETCH_JS" 2>/tmp/hivemind-fetch.err)"; then
    if [[ -n "$CLOUD_OUT" ]] && echo "$CLOUD_OUT" | grep -q '/summaries/'; then
      pass "Deeplake cloud index reachable (summaries found)"
    else
      warn "Deeplake cloud index reachable but no summary rows yet"
    fi
  else
    ERR="$(head -1 /tmp/hivemind-fetch.err 2>/dev/null || true)"
    fail "Deeplake cloud fetch failed: ${ERR:-unknown error} — run: hivemind login"
  fi
else
  fail "missing hivemind-deeplake-fetch.js"
fi

if [[ -f "${HOME}/.deeplake/memory/index.md" ]]; then
  pass "local Hivemind index: ~/.deeplake/memory/index.md"
else
  warn "no local index.md — run: scripts/sync-hivemind-local-index.sh"
fi

if [[ "${FAIL}" -eq 0 ]]; then
  log "All critical checks passed."
  exit 0
fi

log "Some checks failed."
exit 1
