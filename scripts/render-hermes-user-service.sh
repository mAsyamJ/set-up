#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" != "--apply" ]; then
  echo "Refusing to render a user unit without explicit --apply." >&2
  echo "Rendering does not reload, start, or enable systemd." >&2
  exit 2
fi

HARNESS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="${HARNESS_ROOT}/templates/systemd/hermes-harness-operator.service.in"
UNIT_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/systemd/user"
TARGET="${UNIT_DIR}/hermes-harness-operator.service"
PROFILE_HOME="${HOME}/.hermes/profiles/harnessop"
OPERATOR_BIN="${HOME}/.local/bin/harnessop"
REGISTRY="${HARNESS_PROJECT_REGISTRY:-${XDG_CONFIG_HOME:-${HOME}/.config}/agent-harness/projects.json}"
STATE_HOME="${HARNESS_STATE_HOME:-${XDG_STATE_HOME:-${HOME}/.local/state}/agent-harness}"

[ -f "$TEMPLATE" ] || { echo "Missing unit template" >&2; exit 2; }
[ -x "$OPERATOR_BIN" ] || { echo "Missing harnessop profile alias" >&2; exit 2; }
[ -d "$PROFILE_HOME" ] || { echo "Missing harnessop profile directory" >&2; exit 2; }
[ -f "$REGISTRY" ] || { echo "Missing local project registry" >&2; exit 2; }

mkdir -p "$UNIT_DIR"
temporary="${TARGET}.tmp.$$"
sed \
  -e "s|@HOME@|${HOME}|g" \
  -e "s|@HARNESS_ROOT@|${HARNESS_ROOT}|g" \
  -e "s|@HERMES_PROFILE_HOME@|${PROFILE_HOME}|g" \
  -e "s|@HERMES_OPERATOR_BIN@|${OPERATOR_BIN}|g" \
  -e "s|@HARNESS_PROJECT_REGISTRY@|${REGISTRY}|g" \
  -e "s|@HARNESS_STATE_HOME@|${STATE_HOME}|g" \
  "$TEMPLATE" > "$temporary"
chmod 600 "$temporary"
mv "$temporary" "$TARGET"
systemd-analyze --user verify "$TARGET"
echo "Rendered and verified $TARGET"
echo "No daemon reload, start, or enable action was performed."
