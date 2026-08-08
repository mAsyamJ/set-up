import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { normalizeRepositoryPaths } from "../policy/repository-path-policy.js";
import type { HarnessStore } from "../state/sqlite.js";
import { harnessStateHome } from "../state/sqlite.js";
import type { LeaseGrant, TaskRecord } from "../tasks/task-service.js";

const execFileAsync = promisify(execFile);

function safeSegment(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!normalized || normalized.length > 128) throw new Error("invalid worktree identifier");
  return normalized;
}

async function git(projectRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", projectRoot, ...args], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, GIT_TERMINAL_PROMPT: "0" },
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  return stdout.trim();
}

export type WorktreeRecord = {
  id: string;
  leaseId: string;
  taskId: string;
  canonicalPath: string;
  branch: string;
  baseSha: string;
  commitSha: string | null;
  state: "allocated" | "dirty" | "committed" | "preserved" | "released";
};

export class WorktreeManager {
  constructor(private readonly store: HarnessStore) {}

  async allocate(input: {
    projectRoot: string;
    workspaceId: string;
    task: TaskRecord;
    lease: LeaseGrant;
    baseRef?: string;
  }): Promise<WorktreeRecord> {
    const projectRoot = await git(input.projectRoot, ["rev-parse", "--show-toplevel"]);
    const baseSha = await git(projectRoot, ["rev-parse", "--verify", `${input.baseRef ?? "HEAD"}^{commit}`]);
    const taskSegment = safeSegment(input.task.id);
    const workspaceSegment = safeSegment(input.workspaceId);
    const branch = `harness/${taskSegment}/attempt-${input.lease.attempt}`;
    const parent = path.join(harnessStateHome(), "worktrees", workspaceSegment);
    const target = path.join(parent, `${taskSegment}-attempt-${input.lease.attempt}`);
    fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
    if (fs.existsSync(target)) {
      throw new Error(`worktree path already exists and was preserved: ${target}`);
    }
    const branchExists = await git(projectRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`])
      .then(() => true, () => false);
    if (branchExists) throw new Error(`worktree branch already exists and was preserved: ${branch}`);

    await git(projectRoot, ["worktree", "add", "-b", branch, target, baseSha]);
    const canonicalPath = fs.realpathSync(target);
    const id = `worktree_${input.lease.id}`;
    const now = new Date().toISOString();
    try {
      this.store.database().prepare(`
        INSERT INTO worktrees(
          id, lease_id, task_id, canonical_path, branch, base_sha,
          commit_sha, state, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'allocated', ?, ?)
      `).run(
        id,
        input.lease.id,
        input.task.id,
        canonicalPath,
        branch,
        baseSha,
        now,
        now
      );
    } catch (error) {
      fs.writeFileSync(
        path.join(canonicalPath, ".harness-orphan.json"),
        `${JSON.stringify({
          taskId: input.task.id,
          leaseId: input.lease.id,
          branch,
          baseSha,
          reason: "database registration failed; preserve for reconciliation",
        }, null, 2)}\n`,
        { encoding: "utf8", mode: 0o600 }
      );
      throw error;
    }
    return {
      id,
      leaseId: input.lease.id,
      taskId: input.task.id,
      canonicalPath,
      branch,
      baseSha,
      commitSha: null,
      state: "allocated",
    };
  }

  getForTask(taskId: string): WorktreeRecord {
    const row = this.store.database().prepare(`
      SELECT
        id, lease_id AS leaseId, task_id AS taskId,
        canonical_path AS canonicalPath, branch, base_sha AS baseSha,
        commit_sha AS commitSha, state
      FROM worktrees WHERE task_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(taskId) as WorktreeRecord | undefined;
    if (!row) throw new Error("task worktree not found");
    return row;
  }

  getForLease(taskId: string, leaseId: string): WorktreeRecord {
    const row = this.store.database().prepare(`
      SELECT
        id, lease_id AS leaseId, task_id AS taskId,
        canonical_path AS canonicalPath, branch, base_sha AS baseSha,
        commit_sha AS commitSha, state
      FROM worktrees WHERE task_id = ? AND lease_id = ?
    `).get(taskId, leaseId) as WorktreeRecord | undefined;
    if (!row) throw new Error("leased task worktree not found");
    return row;
  }

  async status(record: WorktreeRecord): Promise<string> {
    return git(record.canonicalPath, ["status", "--porcelain=v1", "--untracked-files=all"]);
  }

  async diff(record: WorktreeRecord): Promise<string> {
    return git(record.canonicalPath, ["diff", "--binary", "--no-ext-diff", "--"]);
  }

  preserve(record: WorktreeRecord, state: "dirty" | "committed" | "preserved"): void {
    this.store.database().prepare(`
      UPDATE worktrees SET state = ?, updated_at = ? WHERE id = ?
    `).run(state, new Date().toISOString(), record.id);
  }

  async commitExact(input: {
    record: WorktreeRecord;
    allowedPaths: string[];
    message: string;
    expectedTreeDigest: string;
  }): Promise<string> {
    const expected = normalizeRepositoryPaths(input.allowedPaths);
    if (input.message.trim().length < 1 || input.message.length > 200) {
      throw new Error("commit message must contain 1-200 characters");
    }
    await git(input.record.canonicalPath, ["add", "--", ...expected]);
    const staged = await git(input.record.canonicalPath, ["diff", "--cached", "--name-only", "-z"]);
    const stagedPaths = staged.split("\0").filter(Boolean).sort();
    if (JSON.stringify(stagedPaths) !== JSON.stringify(expected)) {
      throw new Error("staged paths do not exactly match approved paths");
    }
    const stagedTree = await git(input.record.canonicalPath, ["write-tree"]);
    if (stagedTree !== input.expectedTreeDigest) {
      throw new Error("staged tree does not match verified tree");
    }
    await git(input.record.canonicalPath, [
      "-c",
      "user.name=Agent Harness Worker",
      "-c",
      "user.email=agent-harness@localhost",
      "commit",
      "--no-gpg-sign",
      "-m",
      input.message,
    ]);
    const commitSha = await git(input.record.canonicalPath, ["rev-parse", "HEAD"]);
    const committedTree = await git(input.record.canonicalPath, ["rev-parse", "HEAD^{tree}"]);
    if (committedTree !== input.expectedTreeDigest) {
      throw new Error("committed tree does not match verified tree");
    }
    this.store.database().prepare(`
      UPDATE worktrees
      SET commit_sha = ?, state = 'committed', updated_at = ?
      WHERE id = ?
    `).run(commitSha, new Date().toISOString(), input.record.id);
    return commitSha;
  }
}
