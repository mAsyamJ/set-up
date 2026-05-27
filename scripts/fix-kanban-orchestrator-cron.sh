#!/usr/bin/env bash
# Migrate kanban-orchestrator-tick from LLM+bridge to script-only (no Cursor/Kiro calls).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

SRC="${AGENT_HARNESS_HOME}/scripts/aegis-kanban-orchestrator-tick.sh"
DST="${HOME}/.hermes/scripts/aegis-kanban-orchestrator-tick.sh"
JOB_NAME="kanban-orchestrator-tick"
JOBS_JSON="${HOME}/.hermes/cron/jobs.json"

mkdir -p "${HOME}/.hermes/scripts/lib"
cp "$SRC" "$DST"
cp "${AGENT_HARNESS_HOME}/scripts/lib/paths.sh" "${HOME}/.hermes/scripts/lib/" 2>/dev/null || true
cp "${AGENT_HARNESS_HOME}/scripts/lib/project-manifest.sh" "${HOME}/.hermes/scripts/lib/" 2>/dev/null || true
chmod +x "$DST" "${HOME}/.hermes/scripts/lib/"*.sh 2>/dev/null || true
echo "Installed $DST"

if [ ! -f "$JOBS_JSON" ]; then
  echo "No $JOBS_JSON — create cron manually with --no-agent --script aegis-kanban-orchestrator-tick.sh"
  exit 0
fi

python3 <<PY
import json
from pathlib import Path

path = Path("$JOBS_JSON")
data = json.loads(path.read_text())
changed = False
for job in data.get("jobs", []):
    if job.get("name") != "$JOB_NAME":
        continue
    job["prompt"] = ""
    job["skills"] = []
    job["skill"] = None
    job["script"] = "aegis-kanban-orchestrator-tick.sh"
    job["no_agent"] = True
    job["workdir"] = "$AGENT_HARNESS_HOME"
    changed = True
    print(f"Patched cron job {job.get('id')} -> script-only (no LLM bridge)")
    break
else:
    print("Job not found in jobs.json")
if changed:
    path.write_text(json.dumps(data, indent=2) + "\n")
PY

if command -v hermes >/dev/null 2>&1; then
  echo
  echo "=== hermes cron list ==="
  hermes cron list 2>/dev/null || true
fi

echo
echo "Manual test (stdout = next Telegram post):"
"$DST" || true
