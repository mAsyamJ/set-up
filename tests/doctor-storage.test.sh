#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

normal_output="$("$ROOT/cli/harness" doctor --dependency-install)"
printf '%s\n' "$normal_output" | grep -q "repository filesystem: path=$ROOT"
printf '%s\n' "$normal_output" | grep -q "npm cache filesystem: path="
printf '%s\n' "$normal_output" | grep -q "Node temporary filesystem: path="
printf '%s\n' "$normal_output" | grep -q "Linux root filesystem: path=/"

if [ -d /mnt/c ]; then
  windows_available_kb="$(df -Pk /mnt/c | awk 'NR == 2 { print $4 }')"
  if [ "$windows_available_kb" -lt $((10 * 1024 * 1024)) ]; then
    set +e
    tmp_output="$(TMPDIR=/mnt/c "$ROOT/cli/harness" doctor --dependency-install 2>&1)"
    tmp_code=$?
    cache_output="$(npm_config_cache=/mnt/c/agent-harness-npm-cache "$ROOT/cli/harness" doctor --dependency-install 2>&1)"
    cache_code=$?
    set -e
    [ "$tmp_code" -eq 1 ]
    [ "$cache_code" -eq 1 ]
    printf '%s\n' "$tmp_output" | grep -q "Node temporary filesystem needs at least 10 GB free"
    printf '%s\n' "$cache_output" | grep -q "npm cache filesystem needs at least 10 GB free"
  fi
fi

echo "doctor storage tests passed"
