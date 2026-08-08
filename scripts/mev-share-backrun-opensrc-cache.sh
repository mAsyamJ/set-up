#!/usr/bin/env bash
# Cache OpenSrc paths for MEV Share Backrun Flashloan Arbitrage study repos (via opensrc CLI).
# These are external study sources (MEV-Share, Artemis, flashloan examples, DEX math, ML libs, etc.).
# Do not vendor-copy them into the project tree — use opensrc path or the generated .path files.
set -Eeuo pipefail
echo "mev-share-backrun-opensrc-cache: disabled legacy product cache" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"

PROJECT="${MEV_SHARE_BACKRUN_ROOT:-$AGENT_HARNESS_HOME/projects/defi-lab/mev_share_backrun_flashloan_arbitrage}"
RESEARCH="$PROJECT/.harness/research"

mkdir -p "$RESEARCH/opensrc-paths" "$RESEARCH/notes"
: > "$RESEARCH/notes/opensrc-cache.log"
: > "$RESEARCH/notes/opensrc-failed.txt"

if ! command -v opensrc >/dev/null 2>&1; then
  echo "opensrc missing. Install with: npm install -g opensrc" >&2
  exit 1
fi

PACKAGES="$PROJECT/.harness/opensrc-packages.txt"
if [ ! -f "$PACKAGES" ]; then
  echo "Missing $PACKAGES — populate it with the opensrc fetch list (see docs/0_opensrc_research.md) first" >&2
  exit 1
fi

safe_name() {
  echo "$1" | sed 's#/#__#g; s#@#at_#g; s#:#_#g; s#[^A-Za-z0-9_.-]#_#g'
}

cache_one() {
  local spec="$1"
  [[ -z "$spec" || "$spec" =~ ^# ]] && return 0

  echo "== opensrc path $spec =="
  if path="$(opensrc path "$spec" 2>>"$RESEARCH/notes/opensrc-cache.log")"; then
    name="$(safe_name "$spec")"
    printf "%s\n" "$path" > "$RESEARCH/opensrc-paths/${name}.path"
    echo "OK $spec -> $path"
  else
    echo "FAILED $spec" | tee -a "$RESEARCH/notes/opensrc-failed.txt"
  fi
}

while IFS= read -r spec; do
  cache_one "$spec"
done < "$PACKAGES"

echo "Done: MEV Share Backrun Flashloan Arbitrage OpenSrc cache -> $RESEARCH/opensrc-paths/"
