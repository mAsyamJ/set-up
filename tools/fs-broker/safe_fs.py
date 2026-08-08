#!/usr/bin/env python3
"""Descriptor-anchored filesystem broker for Harness worktrees."""

from __future__ import annotations

import json
import os
from pathlib import PurePosixPath
import stat
import sys
import uuid

MAX_BYTES = 1_000_000


def fail(message: str) -> None:
    print(json.dumps({"ok": False, "error": message}))
    raise SystemExit(1)


def components(relative: str) -> list[str]:
    if not isinstance(relative, str) or not relative or "\x00" in relative:
        fail("invalid relative path")
    relative = relative.replace("\\", "/")
    parsed = PurePosixPath(relative)
    if parsed.is_absolute() or any(part in {"", ".", ".."} for part in parsed.parts):
        fail("path must be a normalized relative path")
    return list(parsed.parts)


def within(root: str, candidate: str) -> bool:
    try:
        return os.path.commonpath([root, candidate]) == root
    except ValueError:
        return False


def verify_fd(root: str, fd: int) -> None:
    candidate = os.path.realpath(f"/proc/self/fd/{fd}")
    if candidate.endswith(" (deleted)") or not within(root, candidate):
        fail("descriptor escaped worktree")


def open_parent(root: str, root_fd: int, parts: list[str]) -> tuple[int, str]:
    current = os.dup(root_fd)
    try:
        for part in parts[:-1]:
            next_fd = os.open(
                part,
                os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                dir_fd=current,
            )
            os.close(current)
            current = next_fd
            verify_fd(root, current)
        return current, parts[-1]
    except BaseException:
        os.close(current)
        raise


def read_file(root: str, root_fd: int, request: dict) -> dict:
    parts = components(request.get("path"))
    parent_fd, name = open_parent(root, root_fd, parts)
    try:
        fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=parent_fd)
        try:
            verify_fd(root, fd)
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode):
                fail("path is not a regular file")
            if info.st_size > MAX_BYTES:
                fail("file exceeds 1 MB limit")
            data = bytearray()
            while len(data) <= MAX_BYTES:
                chunk = os.read(fd, min(65536, MAX_BYTES + 1 - len(data)))
                if not chunk:
                    break
                data.extend(chunk)
            if len(data) > MAX_BYTES:
                fail("file exceeds 1 MB limit")
            return {"ok": True, "content": bytes(data).decode("utf-8"), "bytes": len(data)}
        finally:
            os.close(fd)
    finally:
        os.close(parent_fd)


def write_file(root: str, root_fd: int, request: dict) -> dict:
    parts = components(request.get("path"))
    content = request.get("content")
    if not isinstance(content, str):
        fail("content must be a string")
    encoded = content.encode("utf-8")
    if len(encoded) > MAX_BYTES:
        fail("content exceeds 1 MB limit")
    overwrite = request.get("overwrite") is True
    allow_create = request.get("allowCreate") is True
    parent_fd, name = open_parent(root, root_fd, parts)
    temporary = f".harness-tmp-{uuid.uuid4().hex}"
    temporary_created = False
    try:
        verify_fd(root, parent_fd)
        existing_mode = 0o600
        try:
            current = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
            if stat.S_ISLNK(current.st_mode) or not stat.S_ISREG(current.st_mode):
                fail("destination is not a regular file")
            if not overwrite:
                fail("destination exists and overwrite is false")
            existing_mode = stat.S_IMODE(current.st_mode)
        except FileNotFoundError:
            if not allow_create:
                fail("destination does not exist and allowCreate is false")

        fd = os.open(
            temporary,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
            0o600,
            dir_fd=parent_fd,
        )
        temporary_created = True
        try:
            offset = 0
            while offset < len(encoded):
                offset += os.write(fd, encoded[offset:])
            os.fchmod(fd, existing_mode & 0o777)
            os.fsync(fd)
        finally:
            os.close(fd)

        verify_fd(root, parent_fd)
        os.replace(
            temporary,
            name,
            src_dir_fd=parent_fd,
            dst_dir_fd=parent_fd,
        )
        temporary_created = False
        os.fsync(parent_fd)
        return {"ok": True, "bytes": len(encoded)}
    finally:
        if temporary_created:
            try:
                os.unlink(temporary, dir_fd=parent_fd)
            except FileNotFoundError:
                pass
        os.close(parent_fd)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: safe_fs.py <worktree-root>")
    root = os.path.realpath(sys.argv[1])
    if not os.path.isdir(root):
        fail("worktree root is not a directory")
    request = json.load(sys.stdin)
    if not isinstance(request, dict):
        fail("request must be an object")
    root_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        operation = request.get("operation")
        if operation == "read":
            response = read_file(root, root_fd, request)
        elif operation == "write":
            response = write_file(root, root_fd, request)
        else:
            fail("unsupported operation")
        print(json.dumps(response))
    finally:
        os.close(root_fd)


if __name__ == "__main__":
    try:
        main()
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError) as error:
        fail(str(error))
