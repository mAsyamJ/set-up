#!/usr/bin/env bash
# One-shot: bring up Hermes Telegram gate (WSL-friendly).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

echo "=== 1. Telegram WSL drop-in + env timeouts ==="
"${SCRIPT_DIR}/install-hermes-telegram-dropin.sh" || true

echo "=== 2. Bridge + stack ==="
systemctl --user daemon-reload
systemctl --user enable kiro-openai-bridge hermes-gateway aegis-stack.target 2>/dev/null || true
systemctl --user restart kiro-openai-bridge.service
sleep 2

echo "=== 3. Model backend (prefer Cursor if agent logged in) ==="
if command -v agent >/dev/null 2>&1 && agent status 2>&1 | grep -qv 'Not logged in'; then
  if agent models 2>&1 | grep -q 'composer-2'; then
    "${SCRIPT_DIR}/aegis-model.sh" cursor
    python3 -c "
from pathlib import Path
p = Path.home() / '.hermes' / 'config.yaml'
t = p.read_text(encoding='utf-8')
if 'default: kiro-current' in t:
    p.write_text(t.replace('default: kiro-current', 'default: cursor-composer-2'), encoding='utf-8')
    print('Set config.yaml model default to cursor-composer-2')
" 2>/dev/null || true
  else
    echo "WARN: agent logged in but no composer-2 — run: kiro-cli login && ${SCRIPT_DIR}/aegis-model.sh kiro"
  fi
else
  echo "WARN: agent not logged in. Run: agent login"
  echo "      Or: kiro-cli login && ${SCRIPT_DIR}/aegis-model.sh kiro"
fi

echo "=== 4. Provider skill ==="
mkdir -p "${HOME}/.hermes/skills/aegis-provider-switch"
cp "${AEGIS_REPO_ROOT}/docs/kit/templates/hermes-provider-switch/SKILL.md" \
  "${HOME}/.hermes/skills/aegis-provider-switch/SKILL.md"

echo "=== 5. Restart Hermes gateway ==="
systemctl --user restart hermes-gateway.service

echo "=== 6. Health ==="
sleep 3
curl -sf "${KIRO_BRIDGE_URL}/health" | python3 -m json.tool 2>/dev/null || echo "bridge not ready"
systemctl --user is-active hermes-gateway kiro-openai-bridge
hermes gateway status 2>&1 | head -6 || true

echo ""
echo "Telegram may take 1–3 min to connect on WSL (fallback IPs). Watch:"
echo "  journalctl --user -u hermes-gateway -f"
echo "Look for: Connected to Telegram (polling mode)"
echo "Then in Telegram: /commands  /set-home  /provider  /reset"
