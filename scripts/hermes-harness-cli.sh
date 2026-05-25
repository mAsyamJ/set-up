#!/usr/bin/env bash
# Hermes-safe allowlisted harness CLI wrapper (Telegram / shell tool path)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
. "$SCRIPT_DIR/lib/paths.sh"

PROJECT="${1:-}"
CMD="${2:-}"
shift 2 || true

[ -n "$PROJECT" ] && [ -n "$CMD" ] || {
  echo "Usage: hermes-harness-cli.sh <project> <cmd> [args...]" >&2
  echo "Allowed: doctor, status, index-project, run-task, obsidian" >&2
  exit 1
}

PROJECT="$(cd "$PROJECT" && pwd)"
HARNESS="$AGENT_HARNESS_HOME/cli/harness"

case "$CMD" in
  doctor|status|index-project|start-hermes-doctor)
    exec "$HARNESS" "$CMD" "$PROJECT" "$@"
    ;;
  run-task)
    TOOL="${1:-}"
    [ -n "$TOOL" ] || { echo "Usage: run-task <tool> [json-args]" >&2; exit 1; }
    case "$TOOL" in
      project.inspect|rag.search|git.status|git.diff|repo.read|verify.run)
        shift || true
        JSON_ARG="${1:-}"
        if [ -z "$JSON_ARG" ]; then JSON_ARG='{}'; fi
        exec "$HARNESS" run-task "$PROJECT" "$TOOL" "$JSON_ARG"
        ;;
      *)
        echo "DENIED: run-task tool not allowlisted: $TOOL" >&2
        exit 1
        ;;
    esac
    ;;
  obsidian)
    SUB="${1:-}"
    [ -n "$SUB" ] || { echo "Usage: obsidian <init|capture|run-summary|adr> ..." >&2; exit 1; }
    case "$SUB" in
      init|capture|run-summary|adr)
        shift || true
        exec "$HARNESS" obsidian "$SUB" "$PROJECT" "$@"
        ;;
      *)
        echo "DENIED: obsidian subcommand not allowlisted: $SUB" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "DENIED: command not allowlisted: $CMD" >&2
    exit 1
    ;;
esac
