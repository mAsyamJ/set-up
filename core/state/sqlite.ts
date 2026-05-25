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

export class HarnessStore {
  private db: Database.Database;

  constructor(stateDir: string) {
    fs.mkdirSync(stateDir, { recursive: true });
    this.db = new Database(path.join(stateDir, "harness.sqlite"));
    this.db.exec(`
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
      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY, run_id TEXT, tool TEXT, status TEXT,
        requested_at TEXT, resolved_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_traces_run ON traces(run_id);
      CREATE INDEX IF NOT EXISTS idx_tool_calls_run ON tool_calls(run_id);
    `);
  }

  startRun(runId: string, projectRoot: string, agent?: string, taskId?: string): void {
    this.db.prepare(
      `INSERT OR REPLACE INTO runs (id, project_root, agent, task_id, status, started_at, ended_at)
       VALUES (?, ?, ?, ?, 'running', ?, NULL)`
    ).run(runId, projectRoot, agent ?? null, taskId ?? null, new Date().toISOString());
  }

  endRun(runId: string, status: "completed" | "failed"): void {
    this.db.prepare(`UPDATE runs SET status = ?, ended_at = ? WHERE id = ?`)
      .run(status, new Date().toISOString(), runId);
  }

  logTrace(entry: Omit<TraceEntry, "createdAt"> & { createdAt?: string }): void {
    this.db.prepare(
      `INSERT INTO traces (id, run_id, tool, args, result, ok, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(entry.id, entry.runId, entry.tool, entry.args, entry.result, entry.ok ? 1 : 0,
      entry.createdAt ?? new Date().toISOString());
  }

  logToolCall(entry: ToolCallEntry): void {
    this.db.prepare(
      `INSERT INTO tool_calls (id, run_id, tool, args_hash, duration_ms, ok, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(entry.id, entry.runId, entry.tool, entry.argsHash, entry.durationMs, entry.ok ? 1 : 0, entry.createdAt);
  }

  addArtifact(entry: ArtifactEntry): void {
    this.db.prepare(
      `INSERT INTO artifacts (id, run_id, path, mime, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(entry.id, entry.runId, entry.path, entry.mime, entry.createdAt);
  }

  getRunTraces(runId: string): TraceEntry[] {
    const rows = this.db.prepare(
      `SELECT id, run_id as runId, tool, args, result, ok, created_at as createdAt FROM traces WHERE run_id = ? ORDER BY created_at`
    ).all(runId) as Array<{ id: string; runId: string; tool: string; args: string; result: string; ok: number; createdAt: string }>;
    return rows.map((r) => ({
      id: r.id,
      runId: r.runId,
      tool: r.tool,
      args: r.args,
      result: r.result,
      ok: Boolean(r.ok),
      createdAt: r.createdAt,
    }));
  }

  getRun(runId: string) {
    return this.db.prepare(`SELECT * FROM runs WHERE id = ?`).get(runId);
  }

  getLatestRunId(): string | null {
    const row = this.db.prepare(`SELECT id FROM runs ORDER BY started_at DESC LIMIT 1`).get() as { id: string } | undefined;
    return row?.id ?? null;
  }

  close(): void {
    this.db.close();
  }
}

export function projectStateDir(projectRoot: string): string {
  return path.join(projectRoot, ".harness", "state");
}

/** @deprecated use HarnessStore */
export const TraceStore = HarnessStore;
