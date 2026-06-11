#!/usr/bin/env bash
# Hermes-safe allowlisted harness CLI wrapper (Telegram / shell tool path)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"
# shellcheck source=lib/project-manifest.sh
. "$SCRIPT_DIR/lib/project-manifest.sh"

resolve_project_path() {
  local arg="${1:-}"
  [ -n "$arg" ] || return 1
  if [ -d "$arg" ]; then
    cd "$arg" && pwd
    return 0
  fi
  local root
  root="$(project_root_from_name "$arg")"
  if [ -n "$root" ] && [ -d "$root" ]; then
    cd "$root" && pwd
    return 0
  fi
  return 1
}

CMD="${1:-}"
shift || true

HARNESS="$AGENT_HARNESS_HOME/cli/harness"

case "$CMD" in
  list-projects)
    REG="$AGENT_HARNESS_HOME/projects/registry.json"
    [ -f "$REG" ] || { echo "Missing registry: $REG" >&2; exit 1; }
    python3 -c "
import json, os
reg = json.load(open('$REG'))
home = os.environ.get('AGENT_HARNESS_HOME', '$AGENT_HARNESS_HOME')
active = os.environ.get('AEGIS_DEFAULT_PROJECT', '')
state = '$AGENT_HARNESS_HOME/.harness/state/active-project.env'
if os.path.isfile(state):
    for line in open(state):
        if line.startswith('export AEGIS_DEFAULT_PROJECT='):
            active = line.strip().split('=', 1)[1]
for slug, cfg in reg.get('projects', {}).items():
    path = cfg.get('path', '')
    abs_path = path if os.path.isabs(path) else os.path.join(home, path)
    mark = '*' if slug == active else ' '
    print(f\"{mark} {slug:14} {cfg.get('displayName', slug):20} kanban={cfg.get('kanban', '')} path={abs_path}\")
"
    ;;
  switch-project)
    SLUG="${1:-}"
    [ -n "$SLUG" ] || { echo "Usage: switch-project <registry-slug>" >&2; exit 1; }
    exec "$HARNESS" switch-project "$SLUG" --no-restart
    ;;
  validate-all)
    exec bash "$AGENT_HARNESS_HOME/scripts/harness-validate-all-projects.sh"
    ;;
  smoke)
    PROJECT="${1:-$AEGIS_RPC_ROOT}"
    PROJ="$(resolve_project_path "$PROJECT")" || { echo "Unknown project: $PROJECT" >&2; exit 1; }
    exec "$HARNESS" smoke "$PROJ"
    ;;
  doctor|status|index-project|start-hermes-doctor)
    PROJECT="${1:-}"
    [ -n "$PROJECT" ] || { echo "Usage: $CMD <project-or-slug>" >&2; exit 1; }
    PROJ="$(resolve_project_path "$PROJECT")" || { echo "Unknown project: $PROJECT" >&2; exit 1; }
    shift || true
    exec "$HARNESS" "$CMD" "$PROJ" "$@"
    ;;
  audit)
    PROJECT="${1:-}"
    SUB="${2:-}"
    [ -n "$PROJECT" ] && [ -n "$SUB" ] || { echo "Usage: audit <project-or-slug> <run|status|report|schedule|config> ..." >&2; exit 1; }
    PROJ="$(resolve_project_path "$PROJECT")" || { echo "Unknown project: $PROJECT" >&2; exit 1; }
    shift 2 || true
    case "$SUB" in
      run|status|report|schedule|config)
        exec "$HARNESS" audit "$SUB" "$PROJ" "$@"
        ;;
      *)
        echo "DENIED: audit subcommand not allowlisted: $SUB" >&2
        exit 1
        ;;
    esac
    ;;
  run-task)
    PROJECT="${1:-}"
    TOOL="${2:-}"
    [ -n "$PROJECT" ] && [ -n "$TOOL" ] || { echo "Usage: run-task <project-or-slug> <tool> [json]" >&2; exit 1; }
    PROJ="$(resolve_project_path "$PROJECT")" || { echo "Unknown project: $PROJECT" >&2; exit 1; }
    shift 2 || true
    case "$TOOL" in
      project.inspect|rag.search|git.status|git.diff|repo.read|verify.run)
        JSON_ARG="${1:-}"
        [ -z "$JSON_ARG" ] && JSON_ARG='{}'
        exec "$HARNESS" run-task "$PROJ" "$TOOL" "$JSON_ARG"
        ;;
      *)
        echo "DENIED: run-task tool not allowlisted: $TOOL" >&2
        exit 1
        ;;
    esac
    ;;
  obsidian)
    PROJECT="${1:-}"
    SUB="${2:-}"
    [ -n "$PROJECT" ] && [ -n "$SUB" ] || { echo "Usage: obsidian <project-or-slug> <init|capture|run-summary|adr> ..." >&2; exit 1; }
    PROJ="$(resolve_project_path "$PROJECT")" || { echo "Unknown project: $PROJECT" >&2; exit 1; }
    shift 2 || true
    case "$SUB" in
      init|capture|run-summary|adr)
        exec "$HARNESS" obsidian "$SUB" "$PROJ" "$@"
        ;;
      *)
        echo "DENIED: obsidian subcommand not allowlisted: $SUB" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "Usage: hermes-harness-cli.sh <cmd> [args...]" >&2
    echo "Global: list-projects | switch-project <slug> | validate-all" >&2
    echo "Per-project: doctor|status|smoke|index-project|start-hermes-doctor <slug>" >&2
    echo "             run-task <slug> <tool> [json] | obsidian <slug> <subcmd> ... | audit <slug> <subcmd> ..." >&2
    exit 1
    ;;
esac
