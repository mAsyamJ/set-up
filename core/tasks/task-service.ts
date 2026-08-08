import { createHash, randomBytes, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { Principal } from "../auth/principal.js";
import { assertBoundedJson } from "../security/bounded-json.js";
import { containsSensitiveData, redactedJson } from "../security/redaction.js";
import type { HarnessStore } from "../state/sqlite.js";

export type TaskState =
  | "proposed"
  | "queued"
  | "leased"
  | "running"
  | "verifying"
  | "review"
  | "blocked"
  | "cancelled"
  | "failed"
  | "recoverable";

export type TaskRecord = {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  objective: string;
  scope: Record<string, unknown>;
  state: TaskState;
  version: number;
  attemptCount: number;
  idempotencyKey: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  reviewCommitSha: string | null;
  reviewSummary: unknown;
};

export type LeaseGrant = {
  id: string;
  taskId: string;
  workerId: string;
  token: string;
  attempt: number;
  expiresAt: string;
};

type TaskRow = {
  id: string;
  project_id: string;
  workspace_id: string;
  title: string;
  objective: string;
  scope_json: string;
  state: TaskState;
  version: number;
  attempt_count: number;
  idempotency_key: string;
  submission_digest: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  review_commit_sha: string | null;
  review_summary_json: string | null;
};

type LeaseRow = {
  id: string;
  task_id: string;
  worker_id: string;
  token_hash: string;
  attempt: number;
  status: string;
  expires_at: string;
  version: number;
};

function immediate<T>(db: Database.Database, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    if (db.inTransaction) db.exec("ROLLBACK");
    throw error;
  }
}

function taskFromRow(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    title: row.title,
    objective: row.objective,
    scope: JSON.parse(row.scope_json) as Record<string, unknown>,
    state: row.state,
    version: row.version,
    attemptCount: row.attempt_count,
    idempotencyKey: row.idempotency_key,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewCommitSha: row.review_commit_sha,
    reviewSummary: row.review_summary_json ? JSON.parse(row.review_summary_json) : null,
  };
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalValue(item)])
    );
  }
  return value;
}

function submissionDigest(input: {
  projectId: string;
  workspaceId: string;
  title: string;
  objective: string;
  scope: Record<string, unknown>;
  principalId: string;
}): string {
  return createHash("sha256").update(JSON.stringify(canonicalValue(input))).digest("hex");
}

export class TaskService {
  private readonly db: Database.Database;

  constructor(store: HarnessStore) {
    this.db = store.database();
  }

  submit(input: {
    projectId: string;
    workspaceId: string;
    title: string;
    objective: string;
    scope: Record<string, unknown>;
    idempotencyKey: string;
    principal: Principal;
  }): TaskRecord {
    const title = input.title.trim();
    const objective = input.objective.trim();
    if (title.length < 1 || title.length > 200) throw new Error("title must contain 1-200 characters");
    if (objective.length < 1 || objective.length > 4_000) {
      throw new Error("objective must contain 1-4000 characters");
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(input.idempotencyKey)) {
      throw new Error("invalid idempotency key");
    }
    assertBoundedJson(input.scope, "task scope");
    if (containsSensitiveData(input.scope) || containsSensitiveData(objective)) {
      throw new Error("task contains sensitive data");
    }
    const digest = submissionDigest({
      projectId: input.projectId,
      workspaceId: input.workspaceId,
      title,
      objective,
      scope: input.scope,
      principalId: input.principal.id,
    });

    return immediate(this.db, () => {
      const existing = this.db.prepare(`
        SELECT * FROM tasks WHERE project_id = ? AND idempotency_key = ?
      `).get(input.projectId, input.idempotencyKey) as TaskRow | undefined;
      if (existing) {
        if (existing.submission_digest !== digest) {
          throw new Error("idempotency key is already bound to a different task submission");
        }
        return taskFromRow(existing);
      }

      const id = `task_${randomUUID()}`;
      const now = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO tasks(
          id, project_id, workspace_id, title, objective, scope_json, state,
          version, attempt_count, idempotency_key, submission_digest,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'proposed', 0, 0, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.projectId,
        input.workspaceId,
        title,
        objective,
        redactedJson(input.scope),
        input.idempotencyKey,
        digest,
        input.principal.id,
        now,
        now
      );
      this.event(id, null, "proposed", input.principal.id, 0, { idempotencyKey: input.idempotencyKey });
      return this.get(id);
    });
  }

  get(id: string): TaskRecord {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
    if (!row) throw new Error("task not found");
    return taskFromRow(row);
  }

  list(projectId?: string): TaskRecord[] {
    const rows = projectId
      ? this.db.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at").all(projectId)
      : this.db.prepare("SELECT * FROM tasks ORDER BY created_at").all();
    return (rows as TaskRow[]).map(taskFromRow);
  }

  queue(id: string, human: Principal): TaskRecord {
    if (human.kind !== "human") throw new Error("only a human may queue a proposed task");
    return this.transition(id, "proposed", "queued", human.id, {});
  }

  claim(input: {
    taskId: string;
    workerId: string;
    ttlMs?: number;
    now?: Date;
  }): LeaseGrant {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(input.workerId)) {
      throw new Error("invalid worker ID");
    }
    const now = input.now ?? new Date();
    const ttlMs = input.ttlMs ?? 60_000;
    if (ttlMs < 5_000 || ttlMs > 15 * 60_000) throw new Error("invalid lease TTL");
    const token = randomBytes(32).toString("base64url");

    return immediate(this.db, () => {
      const task = this.get(input.taskId);
      if (task.state !== "queued") throw new Error(`task is ${task.state}`);
      const attempt = task.attemptCount + 1;
      const leaseId = `lease_${randomUUID()}`;
      const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
      const changed = this.db.prepare(`
        UPDATE tasks
        SET state = 'leased', version = version + 1, attempt_count = ?,
            updated_at = ?
        WHERE id = ? AND state = 'queued' AND version = ?
      `).run(attempt, now.toISOString(), task.id, task.version);
      if (changed.changes !== 1) throw new Error("task claim conflict");
      this.db.prepare(`
        INSERT INTO leases(
          id, task_id, worker_id, token_hash, attempt, status, created_at,
          heartbeat_at, expires_at, version
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, 0)
      `).run(
        leaseId,
        task.id,
        input.workerId,
        tokenHash(token),
        attempt,
        now.toISOString(),
        now.toISOString(),
        expiresAt
      );
      this.event(task.id, "queued", "leased", `worker:${input.workerId}`, attempt, { leaseId });
      return { id: leaseId, taskId: task.id, workerId: input.workerId, token, attempt, expiresAt };
    });
  }

  heartbeat(input: {
    leaseId: string;
    workerId: string;
    token: string;
    ttlMs?: number;
    now?: Date;
  }): string {
    const now = input.now ?? new Date();
    const ttlMs = input.ttlMs ?? 60_000;
    if (ttlMs < 5_000 || ttlMs > 15 * 60_000) throw new Error("invalid lease TTL");
    return immediate(this.db, () => {
      const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
      const result = this.db.prepare(`
        UPDATE leases
        SET heartbeat_at = ?, expires_at = ?, version = version + 1
        WHERE id = ? AND worker_id = ? AND token_hash = ? AND status = 'active'
          AND expires_at > ?
      `).run(
        now.toISOString(),
        expiresAt,
        input.leaseId,
        input.workerId,
        tokenHash(input.token),
        now.toISOString()
      );
      if (result.changes !== 1) throw new Error("lease is invalid, expired, or not owned by worker");
      return expiresAt;
    });
  }

  requireActiveLease(input: {
    taskId: string;
    workerId: string;
    token: string;
    now?: Date;
  }): LeaseRow {
    const now = input.now ?? new Date();
    const row = this.db.prepare(`
      SELECT * FROM leases
      WHERE task_id = ? AND worker_id = ? AND token_hash = ? AND status = 'active'
    `).get(input.taskId, input.workerId, tokenHash(input.token)) as LeaseRow | undefined;
    if (!row || Date.parse(row.expires_at) <= now.getTime()) {
      throw new Error("active lease required");
    }
    return row;
  }

  startRunning(taskId: string, workerId: string, token: string): TaskRecord {
    const lease = this.requireActiveLease({ taskId, workerId, token });
    return this.transition(taskId, "leased", "running", `worker:${workerId}`, {
      leaseId: lease.id,
    });
  }

  startVerifying(taskId: string, workerId: string, token: string): TaskRecord {
    const lease = this.requireActiveLease({ taskId, workerId, token });
    const current = this.get(taskId);
    if (current.state === "verifying") return current;
    return this.transition(taskId, "running", "verifying", `worker:${workerId}`, {
      leaseId: lease.id,
    });
  }

  moveToReview(input: {
    taskId: string;
    workerId: string;
    token: string;
    commitSha: string;
    treeDigest: string;
    summary: Record<string, unknown>;
  }): TaskRecord {
    if (!/^[0-9a-f]{40,64}$/.test(input.commitSha)) throw new Error("invalid commit SHA");
    if (!/^[0-9a-f]{40,64}$/.test(input.treeDigest)) throw new Error("invalid tree digest");
    if (containsSensitiveData(input.summary)) throw new Error("review summary contains sensitive data");
    return immediate(this.db, () => {
      const lease = this.requireActiveLease({
        taskId: input.taskId,
        workerId: input.workerId,
        token: input.token,
      });
      const task = this.get(input.taskId);
      if (task.state !== "verifying") throw new Error(`task is ${task.state}, expected verifying`);
      const worktree = this.db.prepare(`
        SELECT id, commit_sha, state FROM worktrees
        WHERE task_id = ? AND lease_id = ?
      `).get(input.taskId, lease.id) as
        | { id: string; commit_sha: string | null; state: string }
        | undefined;
      if (
        !worktree ||
        worktree.state !== "committed" ||
        worktree.commit_sha !== input.commitSha
      ) {
        throw new Error("preserved committed worktree evidence is required");
      }
      const verification = this.db.prepare(`
        SELECT COUNT(*) AS count
        FROM verification_runs
        WHERE task_id = ? AND lease_id = ? AND tree_digest = ? AND exit_code = 0
      `).get(input.taskId, lease.id, input.treeDigest) as { count: number };
      if (verification.count < 1) throw new Error("successful verification evidence is required");
      const now = new Date().toISOString();
      const changed = this.db.prepare(`
        UPDATE tasks
        SET state = 'review', version = version + 1, updated_at = ?,
            review_commit_sha = ?, review_summary_json = ?
        WHERE id = ? AND state = 'verifying' AND version = ?
      `).run(
        now,
        input.commitSha,
        redactedJson(input.summary),
        task.id,
        task.version
      );
      if (changed.changes !== 1) throw new Error("task review transition conflict");
      this.db.prepare(`
        UPDATE leases
        SET status = 'released', released_at = ?, version = version + 1
        WHERE id = ? AND status = 'active'
      `).run(now, lease.id);
      this.event(
        task.id,
        "verifying",
        "review",
        `worker:${input.workerId}`,
        lease.attempt,
        { leaseId: lease.id, commitSha: input.commitSha, treeDigest: input.treeDigest }
      );
      return this.get(input.taskId);
    });
  }

  recoverExpired(now = new Date()): string[] {
    return immediate(this.db, () => {
      const rows = this.db.prepare(`
        SELECT * FROM leases WHERE status = 'active' AND expires_at <= ?
      `).all(now.toISOString()) as LeaseRow[];
      const recovered: string[] = [];
      for (const lease of rows) {
        this.db.prepare(`
          UPDATE leases
          SET status = 'expired', released_at = ?, version = version + 1
          WHERE id = ? AND status = 'active' AND version = ?
        `).run(now.toISOString(), lease.id, lease.version);
        const task = this.get(lease.task_id);
        if (["leased", "running", "verifying"].includes(task.state)) {
          this.db.prepare(`
            UPDATE tasks SET state = 'recoverable', version = version + 1, updated_at = ?
            WHERE id = ? AND version = ?
          `).run(now.toISOString(), task.id, task.version);
          this.event(
            task.id,
            task.state,
            "recoverable",
            "harness:recovery",
            lease.attempt,
            { leaseId: lease.id, reason: "lease expired; worktree preserved" }
          );
          recovered.push(task.id);
        }
      }
      return recovered;
    });
  }

  abandonLease(input: {
    taskId: string;
    workerId: string;
    token: string;
    reason: string;
    now?: Date;
  }): TaskRecord {
    const now = input.now ?? new Date();
    return immediate(this.db, () => {
      const lease = this.requireActiveLease({
        taskId: input.taskId,
        workerId: input.workerId,
        token: input.token,
        now,
      });
      const task = this.get(input.taskId);
      const result = this.db.prepare(`
        UPDATE leases
        SET status = 'lost', released_at = ?, version = version + 1
        WHERE id = ? AND status = 'active' AND version = ?
      `).run(now.toISOString(), lease.id, lease.version);
      if (result.changes !== 1) throw new Error("lease abandonment conflict");
      if (["leased", "running", "verifying"].includes(task.state)) {
        this.db.prepare(`
          UPDATE tasks
          SET state = 'recoverable', version = version + 1, updated_at = ?
          WHERE id = ? AND version = ?
        `).run(now.toISOString(), task.id, task.version);
        this.event(
          task.id,
          task.state,
          "recoverable",
          `worker:${input.workerId}`,
          lease.attempt,
          { leaseId: lease.id, reason: input.reason }
        );
      }
      return this.get(input.taskId);
    });
  }

  private transition(
    id: string,
    from: TaskState,
    to: TaskState,
    actorId: string,
    detail: Record<string, unknown>
  ): TaskRecord {
    return immediate(this.db, () => {
      const task = this.get(id);
      if (task.state !== from) throw new Error(`task is ${task.state}, expected ${from}`);
      const now = new Date().toISOString();
      const result = this.db.prepare(`
        UPDATE tasks SET state = ?, version = version + 1, updated_at = ?
        WHERE id = ? AND state = ? AND version = ?
      `).run(to, now, id, from, task.version);
      if (result.changes !== 1) throw new Error("task transition conflict");
      this.event(id, from, to, actorId, task.attemptCount, detail);
      return this.get(id);
    });
  }

  private event(
    taskId: string,
    from: TaskState | null,
    to: TaskState,
    actorId: string,
    attempt: number,
    detail: Record<string, unknown>
  ): void {
    this.db.prepare(`
      INSERT INTO task_events(
        task_id, from_state, to_state, actor_id, attempt, detail_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      from,
      to,
      actorId,
      attempt,
      redactedJson(detail),
      new Date().toISOString()
    );
  }
}
