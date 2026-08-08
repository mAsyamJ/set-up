#!/usr/bin/env bash
set -euo pipefail
echo "Deprecated: the harness does not expose or patch the Hermes dashboard." >&2
echo "Any future dashboard profile must bind to 127.0.0.1 and require authentication." >&2
exit 2
