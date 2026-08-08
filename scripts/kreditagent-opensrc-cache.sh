#!/usr/bin/env bash
# Cache OpenSrc paths for KreditAgent external study repos (not vendored in tree).
set -Eeuo pipefail
echo "kreditagent-opensrc-cache: disabled legacy product cache" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"

PROJECT="${KREDITAGENT_ROOT:-$AGENT_HARNESS_HOME/projects/kreditagent}"
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
  echo "Missing $PACKAGES — run generate from external/ git remotes first" >&2
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

echo "Done: KreditAgent OpenSrc cache -> $RESEARCH/opensrc-paths/"
