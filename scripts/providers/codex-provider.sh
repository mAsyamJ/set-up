#!/usr/bin/env bash
set -euo pipefail

export PATH="${HOME}/.foundry/bin:/home/asyam/.local/bin:/home/asyam/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
SHELL_PATH="${HOME}/.foundry/bin:/home/asyam/.local/bin:/home/asyam/.nvm/versions/node/v22.22.2/bin:/usr/local/bin:/usr/bin:/bin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/paths.sh
source "${SCRIPT_DIR}/../lib/paths.sh"
WORKSPACE="${AEGIS_WORKSPACE:-$AEGIS_RPC_ROOT}"

if [ -n "${1:-}" ]; then
  USER_PROMPT="$1"
elif [ ! -t 0 ]; then
  USER_PROMPT="$(cat)"
else
  echo "ERROR: missing prompt" >&2
  exit 1
fi

if [ -z "$USER_PROMPT" ]; then
  echo "ERROR: missing prompt" >&2
  exit 1
fi

CODEX_BIN="${CODEX_BIN:-codex}"
MODEL="${OPENAI_CODEX_MODEL_INTERACTIVE:-gpt-5.4}"
EFFORT="${OPENAI_CODEX_REASONING_EFFORT_INTERACTIVE:-${OPENAI_CODEX_REASONING_EFFORT:-medium}}"
SANDBOX_MODE="${OPENAI_CODEX_SANDBOX_MODE:-workspace-write}"
LAST_MESSAGE="$(mktemp)"
CODEX_STDERR="$(mktemp)"
trap 'rm -f "$LAST_MESSAGE" "$CODEX_STDERR"' EXIT

if ! command -v "$CODEX_BIN" >/dev/null 2>&1; then
  echo "ERROR: Codex CLI not found on PATH. Install Codex CLI, then run: codex login" >&2
  exit 127
fi

if ! "$CODEX_BIN" login status 2>&1 | grep -qi 'logged in'; then
  echo "ERROR: Codex CLI is not logged in. Run once: codex login" >&2
  exit 42
fi

if ! "$CODEX_BIN" exec \
  --ephemeral \
  --skip-git-repo-check \
  --sandbox "$SANDBOX_MODE" \
  --color never \
  --output-last-message "$LAST_MESSAGE" \
  -C "$WORKSPACE" \
  -m "$MODEL" \
  -c 'shell_environment_policy.inherit=all' \
  -c "shell_environment_policy.set.PATH=\"$SHELL_PATH\"" \
  -c "model_reasoning_effort=\"$EFFORT\"" \
  "$USER_PROMPT" </dev/null >/dev/null 2>"$CODEX_STDERR"; then
  cat "$CODEX_STDERR" >&2
  exit 1
fi

if [ ! -s "$LAST_MESSAGE" ]; then
  echo "ERROR: Codex CLI returned no visible output" >&2
  exit 1
fi

cat "$LAST_MESSAGE"
