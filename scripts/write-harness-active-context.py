#!/usr/bin/env python3
"""Write ~/.hermes/harness-active-context.json for Hermes dashboard + Kanban UI.

Agent Harness `switch-project` invokes this so Hermes can show the active
project's role list (from `.harness/agents/*.agent.md`) alongside global
Hermes profiles — without conflating planning roles with dispatch profiles.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def _find_harness_home(project_root: Path) -> str:
    """Locate Agent Harness repo root (directory containing executable ``cli/harness``)."""
    cur = project_root.resolve()
    for _ in range(12):
        candidate = cur / "cli" / "harness"
        if candidate.is_file():
            return str(cur)
        if cur.parent == cur:
            break
        cur = cur.parent
    return ""


def _extract_soul(md: str) -> str:
    pos = md.find("## Soul")
    if pos < 0:
        return ""
    rest = md[pos + len("## Soul") :].lstrip("\n\r")
    lines_out: list[str] = []
    for line in rest.splitlines():
        if line.startswith("## ") and not line.startswith("## Soul"):
            break
        lines_out.append(line)
    text = " ".join(s.strip() for s in "\n".join(lines_out).split() if s.strip())
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    return text[:500] if text else ""


def build_context(project_root: Path) -> dict | None:
    manifest_path = project_root / ".harness" / "project.manifest.json"
    if not manifest_path.is_file():
        return None
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    proj = manifest.get("project") or {}
    kanban = manifest.get("kanban") or {}
    agents_block = manifest.get("agents") or {}
    enabled = agents_block.get("enabled") or []
    if not isinstance(enabled, list):
        enabled = []

    agents_dir = project_root / ".harness" / "agents"
    agents: list[dict[str, str]] = []
    for slug in enabled:
        if not isinstance(slug, str) or not slug.strip():
            continue
        safe = slug.strip()
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", safe):
            continue
        path = agents_dir / f"{safe}.agent.md"
        soul = ""
        if path.is_file():
            try:
                soul = _extract_soul(path.read_text(encoding="utf-8"))
            except OSError:
                soul = ""
        agents.append({"id": safe, "soul": soul})

    hh = _find_harness_home(project_root)
    return {
        "schema": "harness.dashboard.v1",
        "project": str(proj.get("name") or project_root.name),
        "project_root": str(project_root.resolve()),
        "harness_home": hh,
        "kanban_board": str(kanban.get("board") or ""),
        "agents": agents,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: write-harness-active-context.py <project_root>", file=sys.stderr)
        return 2
    root = Path(sys.argv[1]).expanduser().resolve()
    if not root.is_dir():
        print(f"not a directory: {root}", file=sys.stderr)
        return 1

    ctx = build_context(root)
    out = Path.home() / ".hermes" / "harness-active-context.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    if ctx is None:
        if out.exists():
            try:
                out.unlink()
            except OSError:
                pass
        print(f"no harness manifest at {root}/.harness/project.manifest.json — removed {out}")
        return 0

    out.write_text(json.dumps(ctx, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out} ({ctx.get('project')}, board={ctx.get('kanban_board')}, {len(ctx.get('agents') or [])} agents)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
