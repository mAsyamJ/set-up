import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { HarnessStore, migrateStateDatabase } from "../core/state/sqlite.js";

describe("Harness state migration", () => {
  it("fails closed until an explicit backup-backed migration succeeds", () => {
    const state = fs.mkdtempSync(path.join(os.tmpdir(), "harness-migration-"));
    const databasePath = path.join(state, "harness.sqlite");
    const legacy = new Database(databasePath);
    legacy.exec(`
      CREATE TABLE approvals (
        id TEXT PRIMARY KEY,
        run_id TEXT,
        action TEXT,
        status TEXT,
        approver TEXT,
        created_at TEXT
      );
    `);
    legacy.close();

    assert.throws(() => new HarnessStore(state), /explicit migration/);
    const result = migrateStateDatabase(state);
    assert.equal(result.fromVersion, 0);
    assert.equal(result.toVersion, 2);
    assert.equal(fs.existsSync(result.backupPath), true);
    assert.equal(fs.statSync(result.backupPath).mode & 0o077, 0);

    const store = new HarnessStore(state);
    assert.equal(store.integrityCheck(), "ok");
    store.close();

    const backup = new Database(result.backupPath, { readonly: true });
    assert.equal(String(backup.pragma("integrity_check", { simple: true })), "ok");
    assert.deepEqual(
      backup.prepare(`
        SELECT COUNT(*) AS count
        FROM sqlite_master WHERE type = 'table' AND name = 'approvals'
      `).get(),
      { count: 1 }
    );
    backup.close();
  });
});
