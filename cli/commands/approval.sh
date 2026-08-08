#!/usr/bin/env bash
set -euo pipefail
HARNESS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec node --import tsx "$HARNESS_ROOT/cli/approval-cli.ts" "$@"
