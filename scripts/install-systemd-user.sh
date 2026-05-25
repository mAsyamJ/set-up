#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

UNIT_SRC="${AEGIS_REPO_ROOT}/systemd/user"
UNIT_DST="${AEGIS_SYSTEMD_USER_DIR}"

mkdir -p "$UNIT_DST"

MODEL_STATE="${AEGIS_REPO_ROOT}/runtime/aegis-model.json"
if [ ! -f "$MODEL_STATE" ]; then
  mkdir -p "$(dirname "$MODEL_STATE")"
  printf '%s\n' '{"defaultModel":"kiro-current","updatedAt":null,"updatedBy":"install"}' > "$MODEL_STATE"
  echo "Seeded $MODEL_STATE (default: kiro-current)"
fi

for unit in kiro-openai-bridge.service hermes-gateway.service aegis-stack.target aegis-kanban-dispatch.service wsl-portproxy-refresh.service; do
  src="${UNIT_SRC}/${unit}"
  dst="${UNIT_DST}/${unit}"
  if [ ! -f "$src" ]; then
    echo "ERROR: missing unit file: $src"
    exit 1
  fi
  if grep -q '@AGENT_HARNESS_HOME@' "$src" 2>/dev/null; then
    AEGIS_NODE_DIR="$(dirname "${AEGIS_NODE:-$(command -v node)}")"
    rm -f "$dst"
    sed "s|@AGENT_HARNESS_HOME@|${AGENT_HARNESS_HOME}|g; s|@AEGIS_RPC_ROOT@|${AEGIS_RPC_ROOT}|g; s|@AEGIS_NODE@|${AEGIS_NODE:-$(command -v node)}|g; s|@AEGIS_NODE_DIR@|${AEGIS_NODE_DIR}|g" "$src" > "$dst"
    echo "Installed $dst (from template with paths)"
  else
    ln -sf "$src" "$dst"
    echo "Linked $dst -> $src"
  fi
done

systemctl --user daemon-reload
systemctl --user enable aegis-stack.target
systemctl --user restart kiro-openai-bridge.service

echo "Waiting for Kiro bridge health at ${KIRO_BRIDGE_URL}/health ..."
ready=0
for _ in $(seq 1 30); do
  if curl -sf "${KIRO_BRIDGE_URL}/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "WARN: bridge health check failed. Logs:"
  journalctl --user -u kiro-openai-bridge -n 20 --no-pager -l || true
  exit 1
fi

systemctl --user start aegis-stack.target

for skill_name in aegis-provider-switch aegis-secrets-maintain; do
  PROVIDER_SKILL_SRC="${AEGIS_REPO_ROOT}/docs/kit/templates/hermes-${skill_name}/SKILL.md"
  PROVIDER_SKILL_DST="${HOME}/.hermes/skills/${skill_name}/SKILL.md"
  if [ -f "$PROVIDER_SKILL_SRC" ]; then
    mkdir -p "$(dirname "$PROVIDER_SKILL_DST")"
    cp "$PROVIDER_SKILL_SRC" "$PROVIDER_SKILL_DST"
    echo "Installed Hermes skill: $PROVIDER_SKILL_DST"
  fi
done
if systemctl --user is-active --quiet hermes-gateway 2>/dev/null; then
  systemctl --user restart hermes-gateway.service
  echo "Restarted hermes-gateway (pick up skills)"
fi

chmod +x "${AEGIS_REPO_ROOT}/scripts/aegis-secrets-health.sh" \
  "${AEGIS_REPO_ROOT}/scripts/aegis-secrets-maintain.sh" 2>/dev/null || true

# Legacy path: direct kiro-cli Telegram bot (no Hivemind hooks). Keep disabled.
if systemctl --user list-unit-files telegram-kiro-gateway.service &>/dev/null; then
  systemctl --user disable --now telegram-kiro-gateway.service 2>/dev/null || true
  systemctl --user mask telegram-kiro-gateway.service 2>/dev/null || true
  echo "telegram-kiro-gateway: disabled and masked (use hermes-gateway for Telegram)"
fi

echo
echo "=== aegis-stack status ==="
systemctl --user status kiro-openai-bridge hermes-gateway aegis-stack.target --no-pager -l || true
echo
curl -sf "${KIRO_BRIDGE_URL}/health" && echo
