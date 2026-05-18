#!/usr/bin/env bash
# Mirror Deeplake cloud summary list into ~/.deeplake/memory/index.md for grep/workflows.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

MEMORY_ROOT="${HIVEMIND_MEMORY_PATH:-$HOME/.deeplake/memory}"
INDEX="${MEMORY_ROOT}/index.md"
FETCH_JS="${AEGIS_REPO_ROOT}/scripts/lib/hivemind-deeplake-fetch.js"

mkdir -p "${MEMORY_ROOT}/summaries"

if [[ ! -f "$FETCH_JS" ]]; then
  echo "missing: $FETCH_JS" >&2
  exit 1
fi

BODY="$(node "$FETCH_JS" 2>/dev/null || true)"
if [[ -z "$BODY" ]]; then
  echo "cloud fetch returned empty" >&2
  exit 1
fi

{
  echo "# Hivemind index (synced from Deeplake)"
  echo ""
  echo "Synced: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "$BODY"
} >"$INDEX"

echo "wrote: $INDEX ($(wc -c <"$INDEX") bytes)"
