#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
PROJECT="${1:-}"
[ -n "$PROJECT" ] || { echo "Usage: sync-skills.sh <project-path>" >&2; exit 1; }
PROJECT="$(cd "$PROJECT" && pwd)"
SKILLS_JSON="$PROJECT/.harness/skills.json"
HARNESS_SKILLS="$AGENT_HARNESS_HOME/skills"
DOT_SKILLS="$AGENT_HARNESS_HOME/.skills"
HERMES_SKILLS="${HOME}/.hermes/skills"
PROJECT_HARNESS_SKILLS="$PROJECT/.harness/skills"

echo "=== sync-skills ==="
echo "Canonical: $HARNESS_SKILLS + $DOT_SKILLS"
mkdir -p "$PROJECT_HARNESS_SKILLS" "$HERMES_SKILLS"

# Resolve enabled skill IDs from skills.json or manifest
ENABLED=""
if [ -f "$SKILLS_JSON" ]; then
  ENABLED="$(python3 -c "
import json
d=json.load(open('$SKILLS_JSON'))
for s in d.get('enabled', d.get('skills', [])):
    print(s)
" 2>/dev/null || true)"
fi
if [ -z "$ENABLED" ] && [ -f "$PROJECT/.harness/project.manifest.json" ]; then
  ENABLED="$(python3 -c "
import json
m=json.load(open('$PROJECT/.harness/project.manifest.json'))
for s in m.get('skills', {}).get('enabled', []):
    print(s)
" 2>/dev/null || true)"
fi

sync_one() {
  local id="$1"
  local found=0
  for base in "$DOT_SKILLS" "$HARNESS_SKILLS"; do
    for candidate in "$base/$id/SKILL.md" "$base/$id.md" "$base/${id}-skill.md"; do
      if [ -f "$candidate" ]; then
        dest_dir="$PROJECT_HARNESS_SKILLS/$id"
        mkdir -p "$dest_dir" "$HERMES_SKILLS/$id"
        cp "$candidate" "$dest_dir/SKILL.md"
        cp "$candidate" "$HERMES_SKILLS/$id/SKILL.md"
        echo "OK: $id <- $candidate"
        found=1
        break 2
      fi
    done
  done
  if [ "$found" -eq 0 ]; then
    echo "WARN: skill not found in canonical paths: $id"
  fi
}

if [ -n "$ENABLED" ]; then
  while IFS= read -r sid; do
    [ -n "$sid" ] || continue
    sync_one "$sid"
  done <<< "$ENABLED"
else
  echo "WARN: no enabled skills list — copying registry.json skill names only"
  if [ -f "$HARNESS_SKILLS/registry.json" ]; then
    echo "See $HARNESS_SKILLS/registry.json for available skills"
  fi
fi

# Bootstrap harness OS skills (always)
for skill_dir in "$AGENT_HARNESS_HOME/runtime/hermes"/skill-*/; do
  [ -d "$skill_dir" ] || continue
  [ -f "$skill_dir/SKILL.md" ] || continue
  base="$(basename "$skill_dir")"
  name="${base#skill-}"
  dest="$HERMES_SKILLS/$name"
  mkdir -p "$dest" "$PROJECT_HARNESS_SKILLS/$name"
  cp "$skill_dir/SKILL.md" "$dest/SKILL.md"
  cp "$skill_dir/SKILL.md" "$PROJECT_HARNESS_SKILLS/$name/SKILL.md"
  echo "OK: bootstrap skill $name"
done

echo "Done. Project: $PROJECT_HARNESS_SKILLS | Hermes: $HERMES_SKILLS"
