import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type TraceEntry = {
  id: string;
  runId: string;
  tool: string;
  args: string;
  result: string;
  ok: boolean;
  createdAt: string;
};

export type ToolCallEntry = {
  id: string;
  runId: string;
  tool: string;
  argsHash: string;
  durationMs: number;
  ok: boolean;
  createdAt: string;
};

export type ArtifactEntry = {
  id: string;
  runId: string;
  path: string;
  mime: string;
  createdAt: string;
};

type TraceRow = Omit<TraceEntry, "ok"> & { ok: number };

const SCHEMA_VERSION = 2;
const SCHEMA_CHECKSUM = createHash("sha256").update("agent-harness-schema-v2").digest("hex");

function currentSchema(db: Database.Database): { version: number; checksum: string | null } {
  const table = db.prepare(`
    SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'
  `).get();
  if (!table) return { version: 0, checksum: null };
  const row = db.prepare(`
    SELECT version, checksum FROM schema_migrations ORDER BY version DESC LIMIT 1
  `).get() as
    | { version: number; checksum: string }
    | undefined;
  return row ?? { version: 0, checksum: null };
}

function tableColumns(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>)
    .map((row) => row.name);
}

function migrateLegacyApprovals(db: Database.Database): void {
  const columns = tableColumns(db, "approvals");
  if (columns.length === 0 || columns.includes("action_id")) return;
  if (tableColumns(db, "approvals_legacy_v0").length === 0) {
    db.exec("ALTER TABLE approvals RENAME TO approvals_legacy_v0");
  } else {
    db.exec("DROP TABLE approvals");
  }
}

function initializeSchema(db: Database.Database): void {
  migrateLegacyApprovals(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL, tool TEXT NOT NULL,
      args TEXT, result TEXT, ok INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY, project_root TEXT NOT NULL, agent TEXT, task_id TEXT,
      status TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tool_calls (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL, tool TEXT NOT NULL,
      args_hash TEXT, duration_ms INTEGER, ok INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY, project_root TEXT NOT NULL, kind TEXT, content TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL, path TEXT NOT NULL,
      mime TEXT, created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS action_requests (
      id TEXT PRIMARY KEY,
      digest TEXT NOT NULL UNIQUE,
      principal_id TEXT NOT NULL,
      task_id TEXT,
      project_id TEXT NOT NULL,
      workspace_path TEXT NOT NULL,
      tool_id TEXT NOT NULL,
      command_id TEXT,
      arguments_json TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      risk TEXT NOT NULL,
      policy_version TEXT NOT NULL,
      nonce TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      action_id TEXT NOT NULL UNIQUE REFERENCES action_requests(id),
      status TEXT NOT NULL CHECK(status IN (
        'requested', 'approved', 'consumed', 'denied', 'expired',
        'cancelled', 'invalidated'
      )),
      requested_by TEXT NOT NULL,
      decided_by TEXT,
      requested_at TEXT NOT NULL,
      decided_at TEXT,
      consumed_at TEXT,
      version INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS approval_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      approval_id TEXT NOT NULL REFERENCES approvals(id),
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      title TEXT NOT NULL,
      objective TEXT NOT NULL,
      scope_json TEXT NOT NULL,
      state TEXT NOT NULL CHECK(state IN (
        'proposed', 'queued', 'leased', 'running', 'verifying', 'review',
        'blocked', 'cancelled', 'failed', 'recoverable'
      )),
      version INTEGER NOT NULL DEFAULT 0,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      idempotency_key TEXT NOT NULL,
      submission_digest TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      review_commit_sha TEXT,
      review_summary_json TEXT,
      UNIQUE(project_id, idempotency_key)
    );
    CREATE TABLE IF NOT EXISTS task_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      from_state TEXT,
      to_state TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      attempt INTEGER NOT NULL,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leases (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      worker_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      attempt INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'released', 'expired', 'lost', 'cancelled')),
      created_at TEXT NOT NULL,
      heartbeat_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      released_at TEXT,
      version INTEGER NOT NULL DEFAULT 0,
      UNIQUE(task_id, attempt)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_lease_per_task
      ON leases(task_id) WHERE status = 'active';
    CREATE TABLE IF NOT EXISTS worktrees (
      id TEXT PRIMARY KEY,
      lease_id TEXT NOT NULL UNIQUE REFERENCES leases(id),
      task_id TEXT NOT NULL REFERENCES tasks(id),
      canonical_path TEXT NOT NULL UNIQUE,
      branch TEXT NOT NULL,
      base_sha TEXT NOT NULL,
      commit_sha TEXT,
      state TEXT NOT NULL CHECK(state IN ('allocated', 'dirty', 'committed', 'preserved', 'released')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS verification_runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      lease_id TEXT NOT NULL REFERENCES leases(id),
      command_id TEXT NOT NULL,
      tree_digest TEXT NOT NULL,
      exit_code INTEGER NOT NULL,
      stdout_redacted TEXT NOT NULL,
      stderr_redacted TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      principal_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      subject_id TEXT,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_traces_run ON traces(run_id);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_run ON tool_calls(run_id);
    CREATE INDEX IF NOT EXISTS idx_approval_status ON approvals(status, requested_at);
    CREATE INDEX IF NOT EXISTS idx_task_state ON tasks(state, updated_at);
    CREATE INDEX IF NOT EXISTS idx_lease_task ON leases(task_id, status);
    CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id, id);
    CREATE INDEX IF NOT EXISTS idx_audit_subject ON audit_events(subject_id, created_at);
  `);

  if (!tableColumns(db, "tasks").includes("submission_digest")) {
    db.exec("ALTER TABLE tasks ADD COLUMN submission_digest TEXT");
  }

  db.prepare(`
    INSERT INTO schema_migrations(version, checksum, applied_at)
    VALUES (?, ?, ?)
    ON CONFLICT(version) DO NOTHING
  `).run(SCHEMA_VERSION, SCHEMA_CHECKSUM, new Date().toISOString());
}

export class HarnessStore {
  private readonly db: Database.Database;

  constructor(stateDir: string) {
    fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    fs.chmodSync(stateDir, 0o700);
    const databasePath = path.join(stateDir, "harness.sqlite");
    if (fs.existsSync(databasePath)) {
      const inspection = new Database(databasePath, { readonly: true, fileMustExist: true });
      try {
        const schema = currentSchema(inspection);
        if (schema.version !== SCHEMA_VERSION) {
          throw new Error(
            `Harness state schema ${schema.version} requires explicit migration to ${SCHEMA_VERSION}`
          );
        }
        if (schema.checksum !== SCHEMA_CHECKSUM) {
          throw new Error("Harness state schema checksum mismatch");
        }
      } finally {
        inspection.close();
      }
    }
    const isNew = !fs.existsSync(databasePath);
    this.db = new Database(databasePath);
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = FULL");
    if (isNew) initializeSchema(this.db);
  }

  database(): Database.Database {
    return this.db;
  }

  startRun(runId: string, projectRoot: string, agent?: string, taskId?: string): void {
    this.db.prepare(`
      INSERT INTO runs(id, project_root, agent, task_id, status, started_at, ended_at)
      VALUES (?, ?, ?, ?, 'running', ?, NULL)
    `).run(runId, projectRoot, agent ?? null, taskId ?? null, new Date().toISOString());
  }

  endRun(runId: string, status: "completed" | "failed"): void {
    this.db.prepare("UPDATE runs SET status = ?, ended_at = ? WHERE id = ?")
      .run(status, new Date().toISOString(), runId);
  }

  logTrace(entry: Omit<TraceEntry, "createdAt"> & { createdAt?: string }): void {
    this.db.prepare(`
      INSERT INTO traces(id, run_id, tool, args, result, ok, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.runId,
      entry.tool,
      entry.args,
      entry.result,
      entry.ok ? 1 : 0,
      entry.createdAt ?? new Date().toISOString()
    );
  }

  logToolCall(entry: ToolCallEntry): void {
    this.db.prepare(`
      INSERT INTO tool_calls(id, run_id, tool, args_hash, duration_ms, ok, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.runId,
      entry.tool,
      entry.argsHash,
      entry.durationMs,
      entry.ok ? 1 : 0,
      entry.createdAt
    );
  }

  addArtifact(entry: ArtifactEntry): void {
    this.db.prepare(`
      INSERT INTO artifacts(id, run_id, path, mime, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(entry.id, entry.runId, entry.path, entry.mime, entry.createdAt);
  }

  logAudit(entry: {
    id: string;
    runId?: string | null;
    principalId: string;
    eventType: string;
    subjectId?: string | null;
    detailJson: string;
    createdAt?: string;
  }): void {
    this.db.prepare(`
      INSERT INTO audit_events(
        id, run_id, principal_id, event_type, subject_id, detail_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.runId ?? null,
      entry.principalId,
      entry.eventType,
      entry.subjectId ?? null,
      entry.detailJson,
      entry.createdAt ?? new Date().toISOString()
    );
  }

  getRunTraces(runId: string): TraceEntry[] {
    const rows = this.db.prepare(`
      SELECT id, run_id AS runId, tool, args, result, ok, created_at AS createdAt
      FROM traces WHERE run_id = ? ORDER BY created_at
    `).all(runId) as TraceRow[];
    return rows.map((row) => ({ ...row, ok: Boolean(row.ok) }));
  }

  getRun(runId: string): unknown {
    return this.db.prepare("SELECT * FROM runs WHERE id = ?").get(runId);
  }

  getLatestRunId(): string | null {
    const row = this.db.prepare(
      "SELECT id FROM runs ORDER BY started_at DESC LIMIT 1"
    ).get() as { id: string } | undefined;
    return row?.id ?? null;
  }

  integrityCheck(): string {
    const row = this.db.pragma("integrity_check", { simple: true });
    return String(row);
  }

  close(): void {
    if (this.db.open) this.db.close();
  }
}

export function migrateStateDatabase(stateDir: string): {
  fromVersion: number;
  toVersion: number;
  backupPath: string;
} {
  const databasePath = path.join(stateDir, "harness.sqlite");
  if (!fs.existsSync(databasePath)) throw new Error("Harness state database does not exist");
  const db = new Database(databasePath, { fileMustExist: true });
  try {
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    const fromVersion = currentSchema(db).version;
    if (fromVersion >= SCHEMA_VERSION) {
      throw new Error(`Harness state schema is already version ${fromVersion}`);
    }
    const backupDirectory = path.join(stateDir, "backups");
    fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
    const backupPath = path.join(
      backupDirectory,
      `harness-before-v${SCHEMA_VERSION}-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`
    );
    db.prepare("VACUUM INTO ?").run(backupPath);
    fs.chmodSync(backupPath, 0o600);
    const backup = new Database(backupPath, { readonly: true, fileMustExist: true });
    try {
      const integrity = String(backup.pragma("integrity_check", { simple: true }));
      if (integrity !== "ok") throw new Error(`backup integrity check failed: ${integrity}`);
    } finally {
      backup.close();
    }
    db.exec("BEGIN IMMEDIATE");
    try {
      initializeSchema(db);
      db.exec("COMMIT");
    } catch (error) {
      if (db.inTransaction) db.exec("ROLLBACK");
      throw error;
    }
    return { fromVersion, toVersion: SCHEMA_VERSION, backupPath };
  } finally {
    db.close();
  }
}

export function harnessStateHome(): string {
  return process.env.HARNESS_STATE_HOME ??
    path.join(
      process.env.XDG_STATE_HOME ?? path.join(process.env.HOME ?? "", ".local", "state"),
      "agent-harness"
    );
}

export function projectStateDir(projectRoot: string): string {
  const realRoot = fs.realpathSync(projectRoot);
  const id = `${path.basename(realRoot)}-${createHash("sha256").update(realRoot).digest("hex").slice(0, 12)}`;
  return path.join(harnessStateHome(), "projects", id);
}

/** @deprecated use HarnessStore */
export const TraceStore = HarnessStore;
