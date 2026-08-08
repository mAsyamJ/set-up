#!/usr/bin/env bash
set -Eeuo pipefail
echo "aegis-opensrc-cache: disabled legacy product cache" >&2
exit 2

mkdir -p research/opensrc-paths research/notes
: > research/notes/opensrc-cache.log
: > research/notes/opensrc-failed.txt

if ! command -v opensrc >/dev/null 2>&1; then
  echo "opensrc missing. Install with: npm install -g opensrc"
  exit 1
fi

safe_name() {
  echo "$1" | sed 's#/#__#g; s#@#at_#g; s#:#_#g; s#[^A-Za-z0-9_.-]#_#g'
}

cache_one() {
  local spec="$1"
  [[ -z "$spec" || "$spec" =~ ^# ]] && return 0

  echo "== opensrc path $spec =="
  if path="$(opensrc path "$spec" 2>>research/notes/opensrc-cache.log)"; then
    name="$(safe_name "$spec")"
    printf "%s\n" "$path" > "research/opensrc-paths/${name}.path"
    echo "OK $spec -> $path"
  else
    echo "FAILED $spec" | tee -a research/notes/opensrc-failed.txt
  fi
}

while IFS= read -r spec; do
  cache_one "$spec"
done < research/opensrc-packages.txt

echo "Done: OpenSrc package cache"
