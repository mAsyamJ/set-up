#!/usr/bin/env bash
set -Eeuo pipefail

echo "== Tools =="
for cmd in node npm git rg opensrc; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "OK $cmd: $(command -v "$cmd")"
  else
    echo "MISS $cmd"
  fi
done

echo ""
echo "== OpenSrc list =="
opensrc list 2>/dev/null || true

echo ""
echo "== Path files =="
find research/opensrc-paths -type f -name "*.path" 2>/dev/null | sort | wc -l

echo ""
echo "== Fallback GitHub clones =="
find research/repos -maxdepth 2 -type d -name ".git" 2>/dev/null | wc -l

echo ""
echo "== Important docs =="
for f in \
  docs/research/00-source-code-research-index.md \
  docs/research/01-opensrc-package-map.md \
  docs/research/02-github-repo-map.md \
  docs/research/03-implementation-search-playbook.md \
  research/notes/source-research-results.md
do
  [[ -f "$f" ]] && echo "OK $f" || echo "MISS $f"
done

echo ""
echo "== Next commands =="
echo "bash scripts/aegis-opensrc-cache.sh"
echo "bash scripts/aegis-github-source-cache.sh"
echo "bash scripts/aegis-source-search.sh"
