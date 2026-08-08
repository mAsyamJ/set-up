#!/usr/bin/env bash
# Install 10-minute PM status cron (script-only, no LLM) for Telegram origin delivery.
set -euo pipefail
echo "install-aegis-pm-cron-10m: disabled; Hermes cron is not activated" >&2
exit 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

SRC="${AEGIS_REPO_ROOT}/scripts/aegis-pm-tick-10m.sh"
DST="${HOME}/.hermes/scripts/aegis-pm-tick-10m.sh"
JOB_NAME="aegis-pm-tick-10m"

mkdir -p "${HOME}/.hermes/scripts/lib"
cp "$SRC" "$DST"
cp "${AEGIS_REPO_ROOT}/scripts/lib/paths.sh" "${HOME}/.hermes/scripts/lib/" 2>/dev/null || true
cp "${AEGIS_REPO_ROOT}/scripts/lib/decisions-gate.sh" "${HOME}/.hermes/scripts/lib/" 2>/dev/null || true
chmod +x "$DST" "${HOME}/.hermes/scripts/lib/"*.sh 2>/dev/null || true
echo "Installed $DST"

if ! command -v hermes >/dev/null 2>&1; then
  echo "ERROR: hermes CLI not found" >&2
  exit 1
fi

# Idempotent: remove existing job with this display name (avoids duplicate Telegram posts).
existing_id=""
last_id=""
while IFS= read -r line || [ -n "$line" ]; do
  if [[ "$line" =~ ^[[:space:]]+([0-9a-f]+)[[:space:]]+\[ ]]; then
    last_id="${BASH_REMATCH[1]}"
  fi
  if [[ "$line" == *"Name:"*"$JOB_NAME"* ]]; then
    existing_id="$last_id"
    break
  fi
done < <(hermes cron list 2>/dev/null || true)

if [ -n "$existing_id" ]; then
  echo "Removing existing Hermes cron job $existing_id ($JOB_NAME)"
  hermes cron remove "$existing_id" || true
fi

hermes cron create 'every 10m' \
  --name "$JOB_NAME" \
  --deliver origin \
  --script aegis-pm-tick-10m.sh \
  --no-agent \
  --workdir "${AEGIS_RPC_ROOT}"

echo
echo "=== hermes cron list ==="
hermes cron list
echo
echo "Manual test (stdout = next Telegram post):"
"$DST" || true
echo
echo "Ensure Telegram /set-home is set. Next fire should arrive within ~10 minutes."
