#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../scripts/lib/paths.sh
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"

DEPENDENCY_INSTALL=0
if [ "${1:-}" = "--dependency-install" ]; then
  DEPENDENCY_INSTALL=1
  shift
fi
PROJECT="${1:-${AEGIS_WORKSPACE:-}}"
ERR=0
WARN=0

warn() { printf 'WARN: %s\n' "$*"; WARN=$((WARN + 1)); }
fail() { printf 'FAIL: %s\n' "$*"; ERR=1; }
ok() { printf 'OK: %s\n' "$*"; }
info() { printf 'INFO: %s\n' "$*"; }

nearest_existing_path() {
  local candidate="$1"
  while [ ! -e "$candidate" ]; do
    [ "$candidate" != "/" ] || break
    candidate="$(dirname "$candidate")"
  done
  printf '%s\n' "$candidate"
}

required_path_uses_windows_c=0
check_dependency_path() {
  local label="$1"
  local configured_path="$2"
  local require_native_linux="${3:-0}"
  local canonical probe available_kb used_percent filesystem mountpoint

  canonical="$(realpath -m "$configured_path")"
  probe="$(nearest_existing_path "$canonical")"
  read -r filesystem available_kb used_percent mountpoint <<EOF
$(df -Pk "$probe" | awk 'END { gsub(/%/, "", $5); print $1, $4, $5, $6 }')
EOF

  if [ -z "${filesystem:-}" ] || [ -z "${available_kb:-}" ]; then
    fail "$label filesystem could not be inspected: $canonical"
    return
  fi
  if [ "$require_native_linux" -eq 1 ]; then
    case "$canonical" in
      /home/*) ;;
      *) fail "$label must remain under /home on the native Linux filesystem: $canonical" ;;
    esac
  fi
  case "$canonical" in
    /mnt/c|/mnt/c/*) required_path_uses_windows_c=1 ;;
  esac
  if [ "$available_kb" -lt $((10 * 1024 * 1024)) ]; then
    fail "$label filesystem needs at least 10 GB free: path=$canonical mount=$mountpoint"
  else
    ok "$label filesystem: path=$canonical mount=$mountpoint free_kb=$available_kb"
  fi
  if [ "$used_percent" -ge 95 ]; then
    fail "$label filesystem is at or above 95% utilization: mount=$mountpoint used=${used_percent}%"
  fi
}

printf '=== harness doctor ===\n'

[ -d "$AGENT_HARNESS_HOME/core" ] || fail "missing Harness core directory"
[ -f "$AGENT_HARNESS_HOME/package.json" ] || fail "missing package.json"
[ -f "$AGENT_HARNESS_HOME/package-lock.json" ] || fail "missing package-lock.json"
[ ! -f "$AGENT_HARNESS_HOME/yarn.lock" ] || fail "root yarn.lock is not supported"
[ ! -f "$AGENT_HARNESS_HOME/pnpm-lock.yaml" ] || fail "root pnpm-lock.yaml is not supported"
[ ! -f "$AGENT_HARNESS_HOME/pnpm-workspace.yaml" ] || fail "root pnpm workspace is not supported"

command -v git >/dev/null 2>&1 && ok "git $(git --version | head -1)" || fail "git is unavailable"
command -v node >/dev/null 2>&1 && ok "node $(node --version)" || fail "node is unavailable"
command -v npm >/dev/null 2>&1 && ok "npm $(npm --version)" || fail "npm is unavailable"
command -v bwrap >/dev/null 2>&1 && ok "bubblewrap available" || warn "bubblewrap unavailable; verification execution stays disabled"

if [ "$DEPENDENCY_INSTALL" -eq 1 ]; then
  npm_cache="$(npm config get cache 2>/dev/null || true)"
  node_tmp="$(node -p 'require("node:os").tmpdir()' 2>/dev/null || true)"
  [ -n "$npm_cache" ] || fail "npm cache path could not be resolved"
  [ -n "$node_tmp" ] || fail "Node temporary path could not be resolved"

  check_dependency_path "repository" "$AGENT_HARNESS_HOME" 1
  [ -z "$npm_cache" ] || check_dependency_path "npm cache" "$npm_cache"
  [ -z "$node_tmp" ] || check_dependency_path "Node temporary" "$node_tmp"
  check_dependency_path "Linux root" "/"

  # C: is an important WSL/Windows health signal, but it is not an install
  # target unless one of the required paths above actually resolves there.
  if [ -d /mnt/c ]; then
    read -r windows_available_kb windows_used_percent <<EOF
$(df -Pk /mnt/c | awk 'NR == 2 { gsub(/%/, "", $5); print $4, $5 }')
EOF
    if [ "${windows_available_kb:-0}" -lt $((15 * 1024 * 1024)) ] ||
       [ "${windows_used_percent:-100}" -ge 90 ]; then
      if [ "$required_path_uses_windows_c" -eq 1 ]; then
        warn "Windows C: is low and is also a required write filesystem; hard failures are reported above (free_kb=${windows_available_kb:-0}, used=${windows_used_percent:-100}%)"
      else
        warn "Windows C: is critically low but is not a dependency-install target (free_kb=${windows_available_kb:-0}, used=${windows_used_percent:-100}%)"
      fi
    else
      ok "Windows C: health: free_kb=$windows_available_kb used=${windows_used_percent}%"
    fi
  else
    info "no /mnt/c mount detected; Windows system-health check is not applicable"
  fi
fi

if [ -f "$HARNESS_PROJECT_REGISTRY" ]; then
  if python3 "$AGENT_HARNESS_HOME/scripts/project-registry.py" list >/dev/null 2>&1; then
    ok "local project registry is valid"
  else
    fail "local project registry is invalid: $HARNESS_PROJECT_REGISTRY"
  fi
else
  info "no local project registry; projects are optional"
fi

if [ -z "$PROJECT" ]; then
  info "no project selected; Harness diagnostics are project-independent"
else
  if [ ! -d "$PROJECT" ]; then
    fail "selected project directory does not exist: $PROJECT"
  else
    PROJECT="$(cd "$PROJECT" && pwd -P)"
    [ -d "$PROJECT/.git" ] || git -C "$PROJECT" rev-parse --git-dir >/dev/null 2>&1 ||
      fail "selected project is not a Git worktree: $PROJECT"
    [ -f "$PROJECT/.harness/project.manifest.json" ] ||
      warn "selected project has no versioned Harness adapter"
    ok "selected project inspected without mutation: $PROJECT"
  fi
fi

if command -v hermes >/dev/null 2>&1; then
  info "Hermes is available but optional; doctor does not start or configure it"
else
  info "Hermes is unavailable; Cursor and Harness CLI remain supported"
fi

if command -v systemctl >/dev/null 2>&1; then
  while IFS= read -r unit; do
    [ -n "$unit" ] || continue
    if systemctl --user is-active --quiet "$unit" 2>/dev/null; then
      fail "legacy or autonomous service must remain inactive: $unit"
    fi
  done <<'UNITS'
hermes-gateway.service
cursor-fleet.service
cursor-fleet-tick.service
kiro-openai-bridge.service
aegis-kanban-dispatch.timer
UNITS
else
  info "systemctl unavailable; user-service checks skipped"
fi

printf '=== summary: %s errors, %s warnings ===\n' "$ERR" "$WARN"
exit "$ERR"
