# Agent Harness Migration Log

## 2026-07-23 - v1 Hardening

- Established Cursor-primary and Hermes-optional control planes.
- Externalized machine project paths to the XDG project registry.
- Moved runtime state to XDG state storage.
- Added deny-by-default principals, exact human approvals, transactional task
  leases, confined filesystem operations, trusted verification commands, and
  redacted audit evidence.
- Added restricted Cursor, Hermes operator, and lease-bound worker MCP
  entrypoints.
- Disabled A2A, fleet, legacy bridges, timers, port proxies, bootstrap
  installers, and autonomous services.
- Archived installable legacy user units and Hermes automation material.
- Preserved product gitlinks and unknown-provenance product directories without
  modifying their contents.

## Current Gate

Dependency-free policy, syntax, registry, doctor, storage-path, and focused
security checks pass. The repository, npm cache, Node temporary directory, and
Linux root resolve to Ubuntu-D's native `/dev/sdd` filesystem with ample space.
Low capacity on `/mnt/c` remains a Windows-system-health warning but is not a
dependency-install blocker because no required write path resolves there.

The locked install, reviewed native rebuild, lint, typecheck, build, all 52
tests, and aggregate acceptance gate pass. The disposable worker test reaches
`review` with a verified commit and no remote under network-denied Bubblewrap.

Hermes profiles, actual Hermes workers, systemd, and fleet remain inactive.
