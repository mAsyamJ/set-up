#!/usr/bin/env bash
set -euo pipefail

echo "== Aegis workspace check =="
required=(
  "AGENTS.md"
  "ORCHESTRATOR.md"
  "DECISIONS.md"
  ".skills/registry.json"
  ".agent-plugins/plugin-manifest.json"
  "docs/16-package-source-research.md"
  "SETUP_NEXT.md"
)
for f in "${required[@]}"; do
  if [[ -e "$f" ]]; then echo "OK  $f"; else echo "MISS $f"; fi
done

echo ""
echo "== Services =="
systemctl --user list-units --type=service | grep -Ei "kiro|hermes|gateway" || true

echo ""
echo "== Bridge =="
curl -s http://127.0.0.1:8787/health | jq || true

echo ""
echo "== Skills count =="
find .skills -name SKILL.md | wc -l

