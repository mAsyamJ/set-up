#!/usr/bin/env python3
"""Minimal Kanban viewer when the Hermes dashboard UI is empty.

Serves http://127.0.0.1:9120 and proxies board data from the Hermes API.
No browser localStorage, no React — same data as `hermes kanban list`.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

BOARD = os.environ.get("HERMES_KANBAN_BOARD", "aegis-hackathon")
PORT = int(os.environ.get("AEGIS_KANBAN_VIEWER_PORT", "9120"))
HERMES = os.environ.get("HERMES_DASHBOARD_URL", "http://127.0.0.1:9119").rstrip("/")

COLUMN_LABELS = {
    "triage": "Triage",
    "todo": "Todo",
    "ready": "Ready",
    "running": "In Progress",
    "blocked": "Blocked",
    "done": "Done",
    "archived": "Archived",
}


def fetch_session_token() -> str:
    with urllib.request.urlopen(f"{HERMES}/kanban", timeout=10) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    match = re.search(r'__HERMES_SESSION_TOKEN__="([^"]+)"', html)
    if not match:
        raise RuntimeError(
            f"Could not read session token from {HERMES}/kanban — is `hermes dashboard` running?"
        )
    return match.group(1)


def fetch_board(token: str) -> dict:
    url = f"{HERMES}/api/plugins/kanban/board?board={BOARD}"
    req = urllib.request.Request(url, headers={"X-Hermes-Session-Token": token})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


TOKEN = ""
try:
    TOKEN = fetch_session_token()
except Exception as exc:
    print(f"ERROR: {exc}", file=sys.stderr)
    sys.exit(1)

PAGE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aegis Kanban — BOARD_PLACEHOLDER</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1rem 1.25rem 2rem;
      background: #0f111a; color: #e8e8f0; }
    h1 { font-size: 1.25rem; margin: 0 0 0.25rem; }
    .meta { color: #9ca3af; font-size: 0.85rem; margin-bottom: 1rem; }
    .meta a { color: #a78bfa; }
    .cols { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; }
    .col { flex: 0 0 280px; background: #1a1d2e; border: 1px solid #2d3348;
      border-radius: 8px; padding: 0.5rem; max-height: 80vh; display: flex; flex-direction: column; }
    .col h2 { font-size: 0.8rem; margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .col .n { color: #9ca3af; font-weight: normal; }
    .cards { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
    .card { background: #252938; border: 1px solid #3d4460; border-radius: 6px; padding: 0.5rem 0.6rem;
      font-size: 0.8rem; }
    .card .id { color: #a78bfa; font-family: monospace; font-size: 0.72rem; }
    .card .title { margin-top: 0.2rem; line-height: 1.3; }
    .card .sub { color: #9ca3af; font-size: 0.72rem; margin-top: 0.25rem; }
    .empty { color: #6b7280; font-size: 0.75rem; text-align: center; padding: 1rem 0.5rem;
      border: 1px dashed #3d4460; border-radius: 4px; }
    .err { color: #f87171; }
    .highlight { border-color: #22c55e; }
    button { background: #4f46e5; color: #fff; border: none; padding: 0.4rem 0.75rem;
      border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-bottom: 0.75rem; }
    button:hover { background: #6366f1; }
  </style>
</head>
<body>
  <h1>Aegis Kanban</h1>
  <p class="meta">Board: <strong>BOARD_PLACEHOLDER</strong> · <span id="total">…</span> tasks
    · <a href="HERMES_PLACEHOLDER/kanban" target="_blank" rel="noopener">Hermes dashboard</a>
    · auto-refresh 30s</p>
  <button type="button" onclick="load()">Refresh now</button>
  <div id="err" class="err"></div>
  <div id="board" class="cols">Loading…</div>
  <script>
    const BOARD = "BOARD_PLACEHOLDER";
    const ORDER = ["triage","todo","ready","running","blocked","done","archived"];
    const LABELS = LABELS_JSON;

    async function load() {
      const err = document.getElementById("err");
      const root = document.getElementById("board");
      err.textContent = "";
      try {
        const r = await fetch("/api/board");
        if (!r.ok) throw new Error(r.status + " " + (await r.text()));
        const data = await r.json();
        let total = 0;
        root.innerHTML = "";
        for (const name of ORDER) {
          const col = (data.columns || []).find(c => c.name === name);
          const tasks = col ? col.tasks : [];
          total += tasks.length;
          const el = document.createElement("div");
          el.className = "col" + (name === "running" || name === "done" ? " highlight" : "");
          el.innerHTML = "<h2>" + (LABELS[name] || name) + " <span class=\\"n\\">" + tasks.length + "</span></h2>";
          const cards = document.createElement("div");
          cards.className = "cards";
          if (!tasks.length) {
            cards.innerHTML = '<div class="empty">— no tasks —</div>';
          } else {
            for (const t of tasks) {
              const c = document.createElement("div");
              c.className = "card";
              c.innerHTML = '<div class="id">' + t.id + '</div><div class="title">' +
                (t.title || "").replace(/</g,"&lt;") + '</div><div class="sub">' +
                (t.assignee || "unassigned") + "</div>";
              cards.appendChild(c);
            }
          }
          el.appendChild(cards);
          root.appendChild(el);
        }
        document.getElementById("total").textContent = total;
      } catch (e) {
        err.textContent = String(e);
        root.innerHTML = "";
      }
    }
    load();
    setInterval(load, 30000);
  </script>
</body>
</html>
""".replace("BOARD_PLACEHOLDER", BOARD).replace("HERMES_PLACEHOLDER", HERMES).replace(
    "LABELS_JSON", json.dumps(COLUMN_LABELS)
)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, _fmt, *_args):
        return

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            body = PAGE_HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/api/board":
            try:
                data = fetch_board(TOKEN)
                body = json.dumps(data).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except urllib.error.HTTPError as exc:
                msg = exc.read().decode(errors="replace")
                body = json.dumps({"error": msg, "status": exc.code}).encode()
                self.send_response(exc.code)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(body)
            except Exception as exc:
                body = json.dumps({"error": str(exc)}).encode()
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()


def main() -> None:
    try:
        data = fetch_board(TOKEN)
        total = sum(len(c.get("tasks", [])) for c in data.get("columns", []))
    except Exception as exc:
        print(f"WARN: could not prefetch board: {exc}", file=sys.stderr)
        total = "?"
    url = f"http://127.0.0.1:{PORT}"
    print(f"Aegis Kanban viewer: {url}")
    print(f"Board: {BOARD} · tasks: {total}")
    print("(Hermes UI broken? Use this viewer instead of http://127.0.0.1:9119/kanban)")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
