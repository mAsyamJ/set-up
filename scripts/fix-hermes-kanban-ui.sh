#!/usr/bin/env bash
# Fix the official Hermes Kanban tab at http://127.0.0.1:9119/kanban
# (syncs with CLI current board; supports ?board=<slug> in the URL).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/paths.sh
source "${SCRIPT_DIR}/lib/paths.sh"

BOARD="${HERMES_KANBAN_BOARD:-aegis-hackathon}"
KANBAN_URL="http://127.0.0.1:9119/kanban?board=${BOARD}"
WIN_KANBAN_URL="http://localhost:9119/kanban?board=${BOARD}"
DIST="${HOME}/.hermes/hermes-agent/plugins/kanban/dashboard/dist/index.js"
DEBUG_LOG="${AEGIS_REPO_ROOT}/.cursor/debug-de6a04.log"
RUN_ID="${DEBUG_RUN_ID:-pre-fix}"

# #region agent log
debug_log() {
  local hypothesis_id="$1" location="$2" message="$3"
  shift 3
  DEBUG_LOG="${DEBUG_LOG}" RUN_ID="${RUN_ID}" HYPOTHESIS_ID="${hypothesis_id}" \
    LOG_LOCATION="${location}" LOG_MESSAGE="${message}" python3 -c "
import json, os, sys, time
data = {}
for arg in sys.argv[1:]:
    if '=' in arg:
        k, v = arg.split('=', 1)
        if v in ('0', '1') and k.endswith('Ok'):
            data[k] = v == '1'
        elif v.isdigit():
            data[k] = int(v)
        else:
            data[k] = v
entry = {
  'sessionId': 'de6a04',
  'runId': os.environ.get('RUN_ID', 'unknown'),
  'hypothesisId': os.environ['HYPOTHESIS_ID'],
  'location': os.environ['LOG_LOCATION'],
  'message': os.environ['LOG_MESSAGE'],
  'data': data,
  'timestamp': int(time.time() * 1000),
}
with open(os.environ['DEBUG_LOG'], 'a') as f:
  f.write(json.dumps(entry) + '\n')
" "$@" 2>/dev/null || true
}
# #endregion

echo "=== Fix Hermes Kanban dashboard (official UI) ==="

IS_WSL=0
grep -qi microsoft /proc/version 2>/dev/null && IS_WSL=1
WSL_IP=""
if [ "${IS_WSL}" -eq 1 ]; then
  WSL_IP=$(ip addr show eth0 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1)
fi

BIND_ADDR="$(ss -tlnp 2>/dev/null | awk '/:9119 / {print $4}' | head -1 || true)"
LOOP_OK=0
WSL_IP_OK=0
curl -sf --max-time 2 "http://127.0.0.1:9119/kanban" >/dev/null 2>&1 && LOOP_OK=1
if [ -n "${WSL_IP}" ]; then
  curl -sf --max-time 2 "http://${WSL_IP}:9119/kanban" >/dev/null 2>&1 && WSL_IP_OK=1
fi
# #region agent log
debug_log "H1" "fix-hermes-kanban-ui.sh:precheck" "dashboard reachability before restart" \
  "bindAddr=${BIND_ADDR}" "loopbackOk=${LOOP_OK}" "wslIp=${WSL_IP}" "wslIpOk=${WSL_IP_OK}" "isWsl=${IS_WSL}"
# #endregion

if [ ! -f "${DIST}" ]; then
  echo "ERROR: Hermes kanban plugin not found at ${DIST}"
  exit 1
fi

if ! grep -q 'function readInitialBoard' "${DIST}"; then
  echo "Applying kanban UI patch to ${DIST} ..."
  python3 <<'PY'
from pathlib import Path
import sys

dist = Path.home() / ".hermes/hermes-agent/plugins/kanban/dashboard/dist/index.js"
text = dist.read_text()

needle = """  function readSelectedBoard() {
    try {
      const v = window.localStorage.getItem(LS_BOARD_KEY);
      return (v || "").trim() || null;
    } catch (_e) { return null; }
  }

  function writeSelectedBoard(slug) {"""

insert = """  function readSelectedBoard() {
    try {
      const v = window.localStorage.getItem(LS_BOARD_KEY);
      return (v || "").trim() || null;
    } catch (_e) { return null; }
  }

  /** ?board=<slug> in the dashboard URL (shareable / bookmarkable). */
  function readBoardFromUrl() {
    try {
      const b = (new URLSearchParams(window.location.search).get("board") || "").trim();
      return b || null;
    } catch (_e) { return null; }
  }

  /** URL → localStorage (non-default) → "" (server ``current`` via API). */
  function readInitialBoard() {
    const url = readBoardFromUrl();
    if (url) return url;
    const ls = readSelectedBoard();
    if (ls && ls !== "default") return ls;
    return "";
  }

  function syncBoardToUrl(slug) {
    try {
      const u = new URL(window.location.href);
      if (slug && slug !== "default") u.searchParams.set("board", slug);
      else u.searchParams.delete("board");
      window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch (_e) { /* ignore */ }
  }

  function writeSelectedBoard(slug) {"""

if needle not in text:
    print("ERROR: kanban dist layout changed; patch manually or upgrade kit script", file=sys.stderr)
    sys.exit(1)
text = text.replace(needle, insert, 1)

text = text.replace(
    'const [board, setBoard] = useState(() => readSelectedBoard() || "default");',
    'const [board, setBoard] = useState(() => readInitialBoard());',
    1,
)
text = text.replace(
    'const [board, setBoard] = useState(() => readSelectedBoard() || "aegis-hackathon");',
    'const [board, setBoard] = useState(() => readInitialBoard());',
    1,
)

old_effect = """    useEffect(function () { loadBoardList(); }, [loadBoardList]);

    const scheduleReload = useCallback(function () {"""

new_effect = """    useEffect(function () { loadBoardList(); }, [loadBoardList]);

    // When URL/LS left board unset, follow CLI ``current`` from GET /boards.
    useEffect(function () {
      if (board) return;
      SDK.fetchJSON(`${API}/boards`)
        .then(function (data) {
          const current = data && data.current;
          if (current) {
            setBoard(current);
            writeSelectedBoard(current);
            syncBoardToUrl(current);
          } else {
            setBoard("default");
            writeSelectedBoard("default");
          }
        })
        .catch(function () { setBoard("default"); });
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    const scheduleReload = useCallback(function () {"""

if old_effect not in text:
    print("ERROR: could not insert board-sync effect", file=sys.stderr)
    sys.exit(1)
text = text.replace(old_effect, new_effect, 1)

text = text.replace(
    """      setBoard(nextSlug);
      writeSelectedBoard(nextSlug);
      // Reset filters""",
    """      setBoard(nextSlug);
      writeSelectedBoard(nextSlug);
      syncBoardToUrl(nextSlug);
      // Reset filters""",
    1,
)

dist.write_text(text)
print("Patched OK")
PY
else
  echo "Kanban UI patch already applied."
fi

hermes kanban boards switch "${BOARD}" >/dev/null 2>&1 || true

if [ "${IS_WSL}" -eq 1 ] && [ -x "${SCRIPT_DIR}/update-wsl-portproxy.sh" ]; then
  echo "Refreshing Windows port proxy (localhost:9119 -> WSL) ..."
  bash "${SCRIPT_DIR}/update-wsl-portproxy.sh" || true
fi

echo "Restarting hermes dashboard (WSL: bind 0.0.0.0 for Windows browser) ..."
hermes dashboard --stop 2>/dev/null || true
sleep 1
if [ "${IS_WSL}" -eq 1 ]; then
  hermes dashboard --no-open --skip-build --host 0.0.0.0 --insecure >/dev/null 2>&1 &
else
  hermes dashboard --no-open --skip-build >/dev/null 2>&1 &
fi
for _ in $(seq 1 25); do
  curl -sf "http://127.0.0.1:9119/kanban" >/dev/null 2>&1 && break
  sleep 1
done

BIND_ADDR="$(ss -tlnp 2>/dev/null | awk '/:9119 / {print $4}' | head -1 || true)"
LOOP_OK=0
WSL_IP_OK=0
curl -sf --max-time 2 "http://127.0.0.1:9119/kanban" >/dev/null 2>&1 && LOOP_OK=1
if [ -n "${WSL_IP}" ]; then
  curl -sf --max-time 2 "http://${WSL_IP}:9119/kanban" >/dev/null 2>&1 && WSL_IP_OK=1
fi
# #region agent log
HOST_FLAG="127.0.0.1"
[ "${IS_WSL}" -eq 1 ] && HOST_FLAG="0.0.0.0"
debug_log "H3" "fix-hermes-kanban-ui.sh:post-restart" "dashboard bind after restart" \
  "bindAddr=${BIND_ADDR}" "loopbackOk=${LOOP_OK}" "wslIp=${WSL_IP}" "wslIpOk=${WSL_IP_OK}" "hostFlag=${HOST_FLAG}"
# #endregion

TOKEN="$(curl -sS "http://127.0.0.1:9119/kanban" | sed -n 's/.*__HERMES_SESSION_TOKEN__="\([^"]*\)".*/\1/p')"
TASKS=0
if [ -n "${TOKEN}" ]; then
  TASKS="$(curl -sS -H "X-Hermes-Session-Token: ${TOKEN}" \
    "http://127.0.0.1:9119/api/plugins/kanban/board?board=${BOARD}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(len(c['tasks']) for c in d['columns']))" 2>/dev/null || echo 0)"
fi

echo
echo "Tasks on ${BOARD}: ${TASKS}"
if [ "${IS_WSL}" -eq 1 ]; then
  echo "From Windows browser (use localhost — port proxy):"
  echo "  ${WIN_KANBAN_URL}"
  echo "From WSL/Linux browser:"
  echo "  ${KANBAN_URL}"
else
  echo "Official Hermes Kanban: ${KANBAN_URL}"
fi
echo
echo "In the browser:"
echo "  1. Open the URL for your environment (see above)."
echo "  2. Hard refresh: Ctrl+Shift+R"
echo "  3. If BOARD still shows Default, open DevTools Console and run:"
echo "       localStorage.removeItem('hermes.kanban.selectedBoard'); location.reload();"
echo "  4. Scroll columns RIGHT — tasks are in In Progress (12) and Done (16)."
echo

if [ -x /mnt/c/Windows/System32/cmd.exe ]; then
  /mnt/c/Windows/System32/cmd.exe /c start "" "${WIN_KANBAN_URL}" 2>/dev/null || true
elif command -v wslview >/dev/null 2>&1; then
  wslview "${KANBAN_URL}" 2>/dev/null || true
fi
# #region agent log
debug_log "H2" "fix-hermes-kanban-ui.sh:done" "fix script completed" \
  "tasks=${TASKS}" "wslIpOk=${WSL_IP_OK}"
# #endregion
