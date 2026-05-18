#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

log() { printf "\033[36m[hivemind-capture]\033[0m %s\n" "$*"; }
warn() { printf "\033[33m[warn]\033[0m %s\n" "$*"; }

log "Diagnosing Hivemind capture and wiki summarization"

if ! command -v hivemind >/dev/null 2>&1; then
  echo "Install: npm install -g @deeplake/hivemind && hivemind login && hivemind install"
  exit 1
fi

hivemind whoami 2>/dev/null || warn "not logged in — run: hivemind login"

if [[ -f "${HOME}/.deeplake/credentials.json" ]]; then
  log "credentials.json present"
else
  warn "missing ~/.deeplake/credentials.json"
fi

if [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
  log "OPENROUTER_API_KEY is set in environment"
elif [[ -f "${HOME}/.hermes/.env" ]] && grep -E '^OPENROUTER_API_KEY=.+' "${HOME}/.hermes/.env" >/dev/null 2>&1; then
  log "OPENROUTER_API_KEY active (uncommented) in ~/.hermes/.env"
elif [[ -f "${HOME}/.hermes/.env" ]] && grep -q 'OPENROUTER_API_KEY' "${HOME}/.hermes/.env" 2>/dev/null; then
  warn "OPENROUTER_API_KEY is commented out in ~/.hermes/.env — wiki summarization (hermes -z) will fail"
  warn "Uncomment and set: OPENROUTER_API_KEY=sk-or-... then: systemctl --user restart hermes-gateway"
else
  warn "OPENROUTER_API_KEY not set — wiki worker uses hermes -z with openrouter for summaries"
  warn "Add key to ~/.hermes/.env or export OPENROUTER_API_KEY"
fi

if FETCH_JS="${AEGIS_REPO_ROOT}/scripts/lib/hivemind-deeplake-fetch.js"; [[ -f "$FETCH_JS" ]]; then
  if node "$FETCH_JS" 2>/dev/null | grep -q '/summaries/'; then
    log "Deeplake cloud has summary rows (shared memory works for search/bridge)"
  else
    warn "Deeplake cloud fetch empty"
  fi
fi

WIKI_LOG="${HOME}/.hermes/hooks/deeplake-wiki.log"
if [[ -f "$WIKI_LOG" ]]; then
  log "Last wiki-worker lines:"
  tail -15 "$WIKI_LOG"
else
  warn "No wiki log yet — end a Hermes session to trigger capture"
fi

DEBUG_LOG="${HOME}/.deeplake/hook-debug.log"
if [[ -f "$DEBUG_LOG" ]]; then
  log "Last hook-debug lines:"
  tail -10 "$DEBUG_LOG"
else
  log "No hook-debug.log (set HIVEMIND_DEBUG=1 on a Hermes session to create)"
fi

log "Re-test capture: short message in Cursor or hermes CLI, then check:"
log "  tail -f ~/.hermes/hooks/deeplake-wiki.log"
log "  ls ~/.deeplake/memory/"

exit 0
