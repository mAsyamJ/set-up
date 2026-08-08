# shellcheck shell=bash
# Shared DECISIONS.md gate readers (no secret handling).
aegis_decisions_file() {
  local root="${AEGIS_WORKSPACE:-${AEGIS_RPC_ROOT:-}}"
  [ -n "$root" ] || return 1
  echo "${root}/DECISIONS.md"
}

aegis_decisions_d3_approved() {
  local f
  f="$(aegis_decisions_file)"
  [ -f "$f" ] && grep -q 'Operator approval: push + D3 deploy (ACTIVE)' "$f"
}

aegis_decisions_push_allowlist_active() {
  local f
  f="$(aegis_decisions_file)"
  [ -f "$f" ] && grep -q 'Push allowlist (ACTIVE)' "$f"
}

aegis_decisions_push_allowlist_until() {
  local f date
  f="$(aegis_decisions_file)"
  date="$(grep -A6 'Push allowlist (ACTIVE)' "$f" 2>/dev/null | grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}' | tail -1 || true)"
  if [ -n "$date" ]; then
    echo "$date"
  else
    echo "unknown"
  fi
}
