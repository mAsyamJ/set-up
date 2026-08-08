# Recovery Runbook

## Preserve

Before migration, record root and nested repository status, HEADs, remotes,
worktrees, and non-secret untracked path names. Create Git bundles for every
independent repository, compressed working-tree patches, and a separate archive
of non-ignored untracked files. Never archive ignored secret paths.

Store recovery artifacts outside the repository with directory mode `0700` and
file mode `0600`. Generate SHA-256 checksums and run:

```bash
git bundle verify <bundle>
gzip -t <archive-or-patch>
```

## Restore Drill

Restore into a new temporary directory. Initialize an empty repository, fetch
the exact advertised bundle ref, detach at `FETCH_HEAD`, and apply patches with
`git apply --check` before applying them. List untracked archives without
extracting them first.

Do not use `git reset --hard`, `git clean`, force-remove a worktree, or delete a
branch during recovery. If a checkout is dirty, preserve it and restore
elsewhere.

## Current Baseline

The current Harness-only hardening checkpoint is stored at
`/mnt/d/agent-harness-checkpoints/20260723-133032`. Its Git bundle, binary
patch, intended-untracked archive, status, and SHA-256 manifest were verified.
The patch was also checked against a clean clone in
`/tmp/agent-harness-checkpoint-restore-20260723-133032`.

This checkpoint intentionally excludes the modified RetroPick gitlink and does
not replace the independent product recovery artifacts. Product topology must
not change until each repository has its own durable preservation and
provenance record.

## Dependency Recovery Gate

Ubuntu-D is the active WSL distribution. Its virtual disk is stored at
`D:\wsl\UbuntuD`, and the Harness remains under `/home/asyam/dev/set-up` on the
native Linux filesystem. Do not relocate the repository to `/mnt/d`.

Dependency readiness is based on actual write paths: the repository, the npm
cache reported by `npm config get cache`, the Node temporary directory reported
by `require("node:os").tmpdir()`, and Linux root. Each required filesystem must
have at least 10 GB free and be below 95% utilization.

Low capacity on `/mnt/c` remains a prominent Windows-system-health warning. It
is a hard install failure only if a required write path resolves there.

After recording `df -h / /mnt/c /mnt/d` and `df -i / /mnt/c`, inspect the
lockfile diff and then use:

```bash
cli/harness doctor --dependency-install
npm ci --ignore-scripts --no-audit --no-fund
npm rebuild better-sqlite3 esbuild
npm run acceptance
```

The first command preserves the lockfile and runs no lifecycle scripts. The
second runs only the reviewed native/build package scripts. Do not delete npm
caches or `node_modules` as a recovery step without a separate approval.

## State Migration

Normal Harness opens fail closed on an old SQLite schema. After the new build
and tests pass, an authenticated operator may run:

```bash
cli/harness state migrate <registered-project>
```

The command uses SQLite `VACUUM INTO`, verifies the backup integrity, then
applies the schema change transactionally. Keep the reported backup until the
post-migration acceptance and restart checks pass.
