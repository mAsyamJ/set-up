import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { SourceKind } from "../policies/source-priority.js";

export type IndexedDocument = {
  path: string;
  source: SourceKind;
  title: string;
  body: string;
  mtime: number;
};

export class RagStore {
  private db: Database.Database;

  constructor(stateDir: string) {
    fs.mkdirSync(stateDir, { recursive: true });
    const dbPath = path.join(stateDir, "rag.sqlite");
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        source TEXT NOT NULL,
        title TEXT,
        body TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        UNIQUE(path, source)
      );
      CREATE INDEX IF NOT EXISTS idx_docs_source ON documents(source);
    `);
  }

  upsert(doc: IndexedDocument): void {
    this.db.prepare(
      `INSERT INTO documents (path, source, title, body, mtime) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(path, source) DO UPDATE SET title=excluded.title, body=excluded.body, mtime=excluded.mtime`
    ).run(doc.path, doc.source, doc.title, doc.body, doc.mtime);
  }

  searchFts(query: string, limit = 20): Array<{ path: string; source: SourceKind; title: string; snippet: string }> {
    const q = `%${query.replace(/[%_]/g, "")}%`;
    const rows = this.db.prepare(
      `SELECT path, source, title, substr(body, 1, 200) as snippet FROM documents
       WHERE body LIKE ? OR title LIKE ? OR path LIKE ?
       ORDER BY CASE source
         WHEN 'task' THEN 1 WHEN 'manifest' THEN 2 WHEN 'context' THEN 3
         WHEN 'repo' THEN 4 WHEN 'obsidian' THEN 5 WHEN 'harness' THEN 6 ELSE 7 END
       LIMIT ?`
    ).all(q, q, q, limit) as Array<{ path: string; source: SourceKind; title: string; snippet: string }>;
    return rows;
  }

  clearSource(source: SourceKind): void {
    this.db.prepare(`DELETE FROM documents WHERE source = ?`).run(source);
  }

  close(): void {
    this.db.close();
  }
}

export function ragStateDir(projectRoot: string): string {
  return path.join(projectRoot, ".harness", "state");
}
