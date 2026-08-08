#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export HARNESS_PROJECT_REGISTRY="$TMP/config/projects.json"
export HARNESS_STATE_HOME="$TMP/state"

mkdir -p "$TMP/product/.harness"
"$ROOT/cli/harness" projects init >/dev/null
"$ROOT/cli/harness" projects add example "$TMP/product" --display-name Example >/dev/null

test "$(stat -c '%a' "$HARNESS_PROJECT_REGISTRY")" = "600"
"$ROOT/cli/harness" projects list | grep -F $'example\tavailable\t' >/dev/null

if "$ROOT/cli/harness" switch-project example >/dev/null 2>&1; then
  echo "legacy active-project selection was accepted" >&2
  exit 1
fi

if "$ROOT/cli/harness" projects add "../escape" "$TMP/product" >/dev/null 2>&1; then
  echo "invalid slug was accepted" >&2
  exit 1
fi

if "$ROOT/cli/harness" projects add duplicate "$TMP/product" >/dev/null 2>&1 &&
   "$ROOT/cli/harness" projects add duplicate "$TMP/product" >/dev/null 2>&1; then
  echo "duplicate project was accepted" >&2
  exit 1
fi
