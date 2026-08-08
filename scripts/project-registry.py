#!/usr/bin/env python3
"""Manage the machine-local Agent Harness project registry."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import subprocess
import uuid

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


def registry_path() -> Path:
    explicit = os.environ.get("HARNESS_PROJECT_REGISTRY")
    if explicit:
        return Path(explicit).expanduser()
    config = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    return config / "agent-harness" / "projects.json"


def empty_registry() -> dict:
    return {
        "schema": "agent-harness.projects.v2",
        "pathBase": "registry",
        "projects": {},
    }


def load(path: Path) -> dict:
    if not path.exists():
        return empty_registry()
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema") not in {"agent-harness.projects.v1", "agent-harness.projects.v2"}:
        raise ValueError("unsupported registry schema")
    if not isinstance(data.get("projects"), dict):
        raise ValueError("registry projects must be an object")
    if data.get("schema") == "agent-harness.projects.v1":
        for slug, config in data["projects"].items():
            config.setdefault("id", str(uuid.uuid5(uuid.NAMESPACE_URL, f"agent-harness:{slug}")))
            config.setdefault("provenance", "unknown")
            config.setdefault("executionPolicy", "read-only")
        data["schema"] = "agent-harness.projects.v2"
    return data


def atomic_write(path: Path, data: dict) -> None:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".projects.", suffix=".json", dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def cmd_init(args: argparse.Namespace) -> int:
    path = registry_path()
    if path.exists() and not args.force:
        print(f"registry already exists: {path}", file=sys.stderr)
        return 2
    atomic_write(path, empty_registry())
    print(path)
    return 0


def cmd_add(args: argparse.Namespace) -> int:
    if not SLUG_RE.fullmatch(args.slug):
        raise ValueError("slug must contain lowercase letters, digits, and hyphens")
    project = Path(args.path).expanduser().resolve(strict=True)
    if not project.is_dir():
        raise ValueError("project path must be a directory")
    if not ((project / ".git").exists() or (project / ".harness").is_dir()):
        raise ValueError("project must be a Git repository or contain a .harness adapter")
    if args.allow_workers:
        manifest_path = project / ".harness" / "project.manifest.json"
        if args.provenance != "disposable-canary":
            raise ValueError("worker projects require --provenance disposable-canary")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if (
            manifest.get("schema") != "agent-harness.project.v1"
            or manifest.get("harness", {}).get("disposableCanary") is not True
        ):
            raise ValueError("worker project manifest must declare a disposable canary")
        remotes = subprocess.run(
            ["git", "-C", str(project), "remote"],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        ).stdout.strip()
        if remotes:
            raise ValueError("worker projects must not have Git remotes")
        status = subprocess.run(
            ["git", "-C", str(project), "status", "--porcelain=v1", "--untracked-files=all"],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        ).stdout.strip()
        if status:
            raise ValueError("worker projects must be clean before registration")

    path = registry_path()
    data = load(path)
    if args.slug in data["projects"] and not args.replace:
        raise ValueError(f"project already registered: {args.slug}")
    data["projects"][args.slug] = {
        "id": str(uuid.uuid4()),
        "path": str(project),
        "displayName": args.display_name or args.slug,
        "provenance": args.provenance,
        "executionPolicy": "canary-worker" if args.allow_workers else "read-only",
        **({"kanban": args.kanban} if args.kanban else {}),
    }
    atomic_write(path, data)
    print(f"{args.slug}\t{project}")
    return 0


def cmd_list(_args: argparse.Namespace) -> int:
    path = registry_path()
    data = load(path)
    for slug, config in sorted(data["projects"].items()):
        project = Path(config["path"])
        state = "available" if project.is_dir() else "missing"
        policy = config.get("executionPolicy", "read-only")
        provenance = config.get("provenance", "unknown")
        print(f"{slug}\t{state}\t{policy}\t{provenance}\t{project}")
    return 0


def cmd_resolve(args: argparse.Namespace) -> int:
    data = load(registry_path())
    config = data["projects"].get(args.slug)
    if not config:
        raise ValueError(f"unknown registered project: {args.slug}")
    project = Path(config["path"]).expanduser().resolve(strict=True)
    if not project.is_dir():
        raise ValueError(f"registered project is unavailable: {args.slug}")
    print(f"{config['id']}\t{project}")
    return 0


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(prog="harness projects")
    commands = root.add_subparsers(dest="command", required=True)

    init = commands.add_parser("init")
    init.add_argument("--force", action="store_true")
    init.set_defaults(handler=cmd_init)

    add = commands.add_parser("add")
    add.add_argument("slug")
    add.add_argument("path")
    add.add_argument("--display-name")
    add.add_argument("--kanban")
    add.add_argument("--provenance", default="unknown")
    add.add_argument(
        "--allow-workers",
        action="store_true",
        help="allow only disposable canary-worker execution; products remain read-only",
    )
    add.add_argument("--replace", action="store_true")
    add.set_defaults(handler=cmd_add)

    listing = commands.add_parser("list")
    listing.set_defaults(handler=cmd_list)

    resolve = commands.add_parser("resolve")
    resolve.add_argument("slug")
    resolve.set_defaults(handler=cmd_resolve)
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        return args.handler(args)
    except (OSError, ValueError, json.JSONDecodeError, subprocess.SubprocessError) as error:
        print(f"projects: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
