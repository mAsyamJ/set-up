#!/usr/bin/env bash
set -Eeuo pipefail
echo "aegis-github-source-cache: disabled legacy product cache" >&2
exit 2

mkdir -p research/opensrc-paths research/repos research/notes
: > research/notes/github-cache.log
: > research/notes/github-failed.txt

safe_name() {
  echo "$1" | sed 's#/#__#g; s#@#at_#g; s#:#_#g; s#[^A-Za-z0-9_.-]#_#g'
}

clone_fallback() {
  local repo="$1"
  local dir
  dir="$(safe_name "$repo")"

  if [[ -d "research/repos/$dir/.git" ]]; then
    echo "exists, pulling: research/repos/$dir"
    (cd "research/repos/$dir" && git pull --ff-only) || true
  else
    echo "git clone fallback: $repo"
    git clone --depth 1 "https://github.com/$repo" "research/repos/$dir" || {
      echo "FAILED clone $repo" | tee -a research/notes/github-failed.txt
      return 1
    }
  fi
}

cache_github_one() {
  local repo="$1"
  [[ -z "$repo" || "$repo" =~ ^# ]] && return 0

  echo "== GitHub source: $repo =="

  # OpenSrc supports GitHub owner/repo identifiers. Try that first.
  if command -v opensrc >/dev/null 2>&1; then
    if path="$(opensrc path "$repo" 2>>research/notes/github-cache.log)"; then
      name="$(safe_name "github__$repo")"
      printf "%s\n" "$path" > "research/opensrc-paths/${name}.path"
      echo "OpenSrc OK $repo -> $path"
      return 0
    fi
  fi

  # Fallback for repos OpenSrc cannot resolve.
  clone_fallback "$repo"
}

while IFS= read -r repo; do
  cache_github_one "$repo"
done < research/github-repos.txt

echo "Done: GitHub source cache"
