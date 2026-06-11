#!/usr/bin/env bash
set -Eeuo pipefail

BASE="${BASE:-$HOME/dev/Project}"
HARNESS_ROOT="${HARNESS_ROOT:-$HOME/dev/Project/agent-harness}"
MIDNIGHT="${MIDNIGHT:-$HARNESS_ROOT/projects/security-researcher/midnight-audit}"

mkdir -p \
  "$BASE" \
  "$MIDNIGHT/research/skills" \
  "$MIDNIGHT/research/cyfrin" \
  "$MIDNIGHT/research/trailofbits" \
  "$MIDNIGHT/research/benchmarks" \
  "$MIDNIGHT/audit/static" \
  "$MIDNIGHT/audit/fuzz" \
  "$MIDNIGHT/audit/notes"

mirror_dir() {
  local src="$1"
  local dst="$2"
  mkdir -p "$dst"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$src/" "$dst/"
  else
    rm -rf "$dst"
    mkdir -p "$dst"
    cp -a "$src"/. "$dst"/
  fi
}

clone_or_pull() {
  local repo="$1"
  local dir="$2"
  if [ -d "$dir/.git" ]; then
    echo "[pull] $dir"
    git -C "$dir" pull --ff-only || true
  else
    echo "[clone] $repo -> $dir"
    git clone "$repo" "$dir"
  fi
}

echo "[phase] clone/pull repositories"
clone_or_pull https://github.com/austintgriffith/evm-audit-skills.git "$BASE/evm-audit-skills"
clone_or_pull https://github.com/gonzaloetjo/solidity-audit-skills.git "$BASE/solidity-audit-skills"
clone_or_pull https://github.com/farrellh1/smart-contract-auditor-skill.git "$BASE/smart-contract-auditor-skill"
clone_or_pull https://github.com/Cyfrin/audit-checklist.git "$BASE/cyfrin-audit-checklist"
clone_or_pull https://github.com/Cyfrin/aderyn.git "$BASE/aderyn"
clone_or_pull https://github.com/Cyfrin/aderyn-ci.git "$BASE/aderyn-ci"
clone_or_pull https://github.com/crytic/slither.git "$BASE/slither"
clone_or_pull https://github.com/crytic/echidna.git "$BASE/echidna"
clone_or_pull https://github.com/crytic/medusa.git "$BASE/medusa"
clone_or_pull https://github.com/crytic/building-secure-contracts.git "$BASE/building-secure-contracts"
clone_or_pull https://github.com/blocksecteam/ReEVMBench.git "$BASE/ReEVMBench"

echo "[phase] mirror repositories into midnight research/"
mirror_dir "$BASE/evm-audit-skills" "$MIDNIGHT/research/skills/evm-audit-skills"
mirror_dir "$BASE/solidity-audit-skills" "$MIDNIGHT/research/skills/solidity-audit-skills"
mirror_dir "$BASE/smart-contract-auditor-skill" "$MIDNIGHT/research/skills/smart-contract-auditor-skill"
mirror_dir "$BASE/cyfrin-audit-checklist" "$MIDNIGHT/research/cyfrin/audit-checklist"
mirror_dir "$BASE/building-secure-contracts" "$MIDNIGHT/research/trailofbits/building-secure-contracts"
mirror_dir "$BASE/ReEVMBench" "$MIDNIGHT/research/benchmarks/ReEVMBench"

echo "[phase] optional global skill wiring for Claude/OpenClaw layout"
mkdir -p "$HOME/.claude/skills"
mirror_dir "$BASE/solidity-audit-skills" "$HOME/.claude/skills/solidity-audit-skills"
mirror_dir "$BASE/smart-contract-auditor-skill" "$HOME/.claude/skills/smart-contract-audit"

if command -v openclaw >/dev/null 2>&1; then
  for s in \
    evm-audit-master \
    evm-audit-defi-lending \
    evm-audit-precision-math \
    evm-audit-signatures \
    evm-audit-oracles \
    evm-audit-erc20 \
    evm-audit-dos \
    evm-audit-access-control
  do
    openclaw skills install "$BASE/evm-audit-skills/$s" || true
  done
fi

echo "[phase] toolchain install (best-effort)"
python3 -m pip install --user pipx || true
python3 -m pipx ensurepath || true
pipx install slither-analyzer || pipx upgrade slither-analyzer || true

if ! command -v cyfrinup >/dev/null 2>&1; then
  curl -L https://raw.githubusercontent.com/Cyfrin/up/main/install | bash || true
fi
if command -v cyfrinup >/dev/null 2>&1; then
  cyfrinup || true
fi

if command -v go >/dev/null 2>&1; then
  go install github.com/crytic/medusa@latest || true
else
  echo "[warn] Go not found; skipping medusa install"
fi

echo "[done] Midnight audit skill stack installed."
echo "Next:"
echo "  cd $MIDNIGHT"
echo "  forge build"
echo "  aderyn . -o audit/static/aderyn.md"
echo "  slither . --checklist > audit/static/slither-checklist.md"
