#!/usr/bin/env bash
set -euo pipefail
echo "setup-shell: disabled; Harness does not modify shell or global Git configuration" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

ALIAS_LINE="alias aegis-dev='${AEGIS_REPO_ROOT}/scripts/start-aegis-dev.sh'"
BASHRC="${HOME}/.bashrc"
TEMPLATE="${AEGIS_REPO_ROOT}/docs/kit/templates/git-commit-template.txt"

echo "=== Aegis shell setup ==="
echo "Repo: ${AEGIS_REPO_ROOT}"
echo

if grep -q "alias aegis-dev=" "$BASHRC" 2>/dev/null; then
  echo "OK   aegis-dev alias already in ${BASHRC}"
else
  echo "" >> "$BASHRC"
  echo "# Aegis hackathon kit" >> "$BASHRC"
  echo "$ALIAS_LINE" >> "$BASHRC"
  echo "Added aegis-dev alias to ${BASHRC}"
fi

if [ -f "$TEMPLATE" ]; then
  if git config --global commit.template >/dev/null 2>&1; then
    current="$(git config --global commit.template)"
    echo "OK   git commit.template already set: ${current}"
  else
    git config --global commit.template "$TEMPLATE"
    echo "Set git commit.template → ${TEMPLATE}"
  fi
else
  echo "WARN commit template missing: ${TEMPLATE}"
fi

echo
echo "Run: source ~/.bashrc   (or open a new terminal)"
echo "Then: aegis-dev"
