#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/../../scripts/lib/paths.sh"
PROJECT="${1:-}"
RUN_ID="${2:-}"
[ -n "$PROJECT" ] || { echo "Usage: run-report.sh <project-path> [run-id]" >&2; exit 1; }
PROJECT="$(cd "$PROJECT" && pwd)"
STATE="$PROJECT/.harness/state/harness.sqlite"

if [ ! -f "$STATE" ]; then
  echo "No trace database at $STATE"
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  python3 <<PY
import sqlite3, json, sys
db = sqlite3.connect("$STATE")
run_id = "$RUN_ID"
if not run_id:
    row = db.execute("SELECT id FROM runs ORDER BY started_at DESC LIMIT 1").fetchone()
    run_id = row[0] if row else None
if not run_id:
    print("No runs found")
    sys.exit(1)
run = db.execute("SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()
cols = [d[0] for d in db.execute("SELECT * FROM runs LIMIT 0").description]
run_d = dict(zip(cols, run)) if run else {}
traces = db.execute(
    "SELECT tool, ok, created_at FROM traces WHERE run_id = ? ORDER BY created_at",
    (run_id,),
).fetchall()
print(f"# Run report: {run_id}")
print()
print(f"- Project: {run_d.get('project_root', '?')}")
print(f"- Agent: {run_d.get('agent', '?')}")
print(f"- Status: {run_d.get('status', '?')}")
print(f"- Started: {run_d.get('started_at', '?')}")
print(f"- Ended: {run_d.get('ended_at', '(running)')}")
print()
print("## Tool calls")
for tool, ok, ts in traces:
    mark = "OK" if ok else "FAIL"
    print(f"- [{mark}] {tool} @ {ts}")
PY
else
  echo "python3 required for run-report"
  exit 1
fi
