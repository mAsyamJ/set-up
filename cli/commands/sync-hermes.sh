#!/usr/bin/env bash
# Sync Agent Harness OS skills + memory rules + MCP into Hermes (~/.hermes)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../scripts/lib/paths.sh
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"

PROJECT="${1:-$AEGIS_RPC_ROOT}"
PROJECT="$(cd "$PROJECT" && pwd)"
HERMES_SKILLS="${HOME}/.hermes/skills"

echo "=== sync-hermes ==="
echo "Harness: $AGENT_HARNESS_HOME"
echo "Project: $PROJECT"
echo "Hermes skills: $HERMES_SKILLS"
echo

mkdir -p "$HERMES_SKILLS"

# Bootstrap skills from runtime/hermes/skill-*/
for skill_dir in "$AGENT_HARNESS_HOME/runtime/hermes"/skill-*/; do
  [ -d "$skill_dir" ] || continue
  [ -f "$skill_dir/SKILL.md" ] || continue
  base="$(basename "$skill_dir")"
  name="${base#skill-}"
  dest="$HERMES_SKILLS/$name"
  mkdir -p "$dest"
  cp "$skill_dir/SKILL.md" "$dest/SKILL.md"
  echo "OK: skill $name"
done

# Memory rules (reference copy for operators)
if [ -f "$AGENT_HARNESS_HOME/runtime/hermes/memory-rules/MEMORY_RULES.md" ]; then
  mkdir -p "${HOME}/.hermes/memory-rules"
  cp "$AGENT_HARNESS_HOME/runtime/hermes/memory-rules/MEMORY_RULES.md" \
    "${HOME}/.hermes/memory-rules/MEMORY_RULES.md"
  echo "OK: memory-rules/MEMORY_RULES.md"
fi

# Also sync plugin copy for consistency
if [ -f "$AGENT_HARNESS_HOME/.agent-plugins/hermes/MEMORY_RULES.md" ]; then
  cp "$AGENT_HARNESS_HOME/.agent-plugins/hermes/MEMORY_RULES.md" \
    "${HOME}/.hermes/memory-rules/MEMORY_RULES.md"
fi

# Merge harness MCP into ~/.hermes/config.yaml
if [ -x "$AGENT_HARNESS_HOME/scripts/merge-hermes-harness-mcp.sh" ]; then
  bash "$AGENT_HARNESS_HOME/scripts/merge-hermes-harness-mcp.sh" "$PROJECT"
fi

# Project manifest skills
if [ -f "$SCRIPT_DIR/sync-skills.sh" ]; then
  bash "$SCRIPT_DIR/sync-skills.sh" "$PROJECT"
fi

echo
echo "Done. Restart Hermes gateway:"
echo "  systemctl --user restart hermes-gateway"
echo "Telegram: send /reset then ask about harness capabilities."
