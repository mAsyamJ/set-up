#!/usr/bin/env bash
# Non-mutating harness acceptance. It never installs dependencies or starts services.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib/paths.sh"

cd "$AGENT_HARNESS_HOME"
cli/harness doctor
cli/harness doctor --dependency-install
bash tests/doctor-storage.test.sh
find cli scripts -maxdepth 2 -type f -name '*.sh' -print0 | xargs -0 -n1 bash -n
python3 -m json.tool projects/registry.example.json >/dev/null
python3 -m json.tool agents/registry.json >/dev/null
python3 -m json.tool tools/policies/default.tool-policy.json >/dev/null
python3 -m json.tool tools/policies/command-catalog.json >/dev/null
python3 -c '
import pathlib
import sys
for name in sys.argv[1:]:
    compile(pathlib.Path(name).read_text(encoding="utf-8"), name, "exec")
' scripts/project-registry.py tools/fs-broker/safe_fs.py
git diff --check
npm run lint

if [ ! -x node_modules/.bin/tsx ] || [ ! -x node_modules/.bin/tsc ]; then
  echo "FAIL: dependencies absent; run the reviewed locked install after dependency readiness passes" >&2
  exit 2
fi

npm run typecheck
npm run build
npm test
echo "=== harness acceptance PASSED ==="
