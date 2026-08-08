import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { ActionRecord } from "../actions/action-record.js";
import { actionDigest, canonicalArgumentsJson } from "../actions/action-record.js";
import type { Principal } from "../auth/principal.js";
import { redactedJson } from "../security/redaction.js";
import type { HarnessStore } from "../state/sqlite.js";

export type ApprovalStatus =
  | "requested"
  | "approved"
  | "consumed"
  | "denied"
  | "expired"
  | "cancelled"
  | "invalidated";

type ApprovalView = {
  id: string;
  actionId: string;
  digest: string;
  status: ApprovalStatus;
  principalId: string;
  taskId: string | null;
  projectId: string;
  workspacePath: string;
  toolId: string;
  commandId: string | null;
  risk: string;
  policyVersion: string;
  summary: unknown;
  expiresAt: string;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  consumedAt: string | null;
  version: number;
};

type JoinedRow = {
  id: string;
  action_id: string;
  digest: string;
  status: ApprovalStatus;
  principal_id: string;
  task_id: string | null;
  project_id: string;
  workspace_path: string;
  tool_id: string;
  command_id: string | null;
  arguments_json: string;
  summary_json: string;
  risk: string;
  policy_version: string;
  nonce: string;
  action_created_at: string;
  expires_at: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  consumed_at: string | null;
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

function parseRow(row: JoinedRow): ApprovalView {
  return {
    id: row.id,
    actionId: row.action_id,
    digest: row.digest,
    status: row.status,
    principalId: row.principal_id,
    taskId: row.task_id,
    projectId: row.project_id,
    workspacePath: row.workspace_path,
    toolId: row.tool_id,
    commandId: row.command_id,
    risk: row.risk,
    policyVersion: row.policy_version,
    summary: JSON.parse(row.summary_json),
    expiresAt: row.expires_at,
    requestedAt: row.requested_at,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    consumedAt: row.consumed_at,
    version: row.version,
  };
}

function actionFromRow(row: JoinedRow): ActionRecord {
  return Object.freeze({
    id: row.action_id,
    principalId: row.principal_id,
    taskId: row.task_id,
    projectId: row.project_id,
    workspacePath: row.workspace_path,
    toolId: row.tool_id,
    commandId: row.command_id,
    arguments: Object.freeze(JSON.parse(row.arguments_json) as Record<string, unknown>),
    risk: row.risk as ActionRecord["risk"],
    policyVersion: row.policy_version,
    nonce: row.nonce,
    createdAt: row.action_created_at,
    expiresAt: row.expires_at,
  });
}

const JOIN_SQL = `
  SELECT
    p.id, p.action_id, p.status, p.requested_at, p.decided_by, p.decided_at,
    p.consumed_at, p.version,
    a.digest, a.principal_id, a.task_id, a.project_id, a.workspace_path,
    a.tool_id, a.command_id, a.arguments_json, a.summary_json, a.risk,
    a.policy_version, a.nonce, a.created_at AS action_created_at, a.expires_at
  FROM approvals p
  JOIN action_requests a ON a.id = p.action_id
`;

export class ApprovalService {
  private readonly db: Database.Database;

  constructor(store: HarnessStore) {
    this.db = store.database();
  }

  request(action: ActionRecord, summary: Record<string, unknown>): ApprovalView {
    const approvalId = `approval_${randomUUID()}`;
    const digest = actionDigest(action);
    const now = new Date().toISOString();
    return immediate(this.db, () => {
      this.db.prepare(`
        INSERT INTO action_requests(
          id, digest, principal_id, task_id, project_id, workspace_path,
          tool_id, command_id, arguments_json, summary_json, risk,
          policy_version, nonce, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        action.id,
        digest,
        action.principalId,
        action.taskId,
        action.projectId,
        action.workspacePath,
        action.toolId,
        action.commandId,
        canonicalArgumentsJson(action.arguments),
        redactedJson(summary),
        action.risk,
        action.policyVersion,
        action.nonce,
        action.createdAt,
        action.expiresAt
      );
      this.db.prepare(`
        INSERT INTO approvals(
          id, action_id, status, requested_by, requested_at, version
        ) VALUES (?, ?, 'requested', ?, ?, 0)
      `).run(approvalId, action.id, action.principalId, now);
      this.event(approvalId, null, "requested", action.principalId, { digest });
      return this.get(approvalId);
    });
  }

  get(id: string): ApprovalView {
    const row = this.db.prepare(`${JOIN_SQL} WHERE p.id = ?`).get(id) as JoinedRow | undefined;
    if (!row) throw new Error("approval not found");
    return parseRow(row);
  }

  list(status?: ApprovalStatus): ApprovalView[] {
    const rows = status
      ? this.db.prepare(`${JOIN_SQL} WHERE p.status = ? ORDER BY p.requested_at`).all(status)
      : this.db.prepare(`${JOIN_SQL} ORDER BY p.requested_at`).all();
    return (rows as JoinedRow[]).map(parseRow);
  }

  decide(
    id: string,
    human: Principal,
    decision: "approved" | "denied",
    now = new Date()
  ): ApprovalView {
    if (human.kind !== "human" || human.authenticationMethod !== "tty-passphrase") {
      throw new Error("only an authenticated human operator may decide approvals");
    }
    const result = immediate(this.db, () => {
      const row = this.row(id);
      if (row.status !== "requested") throw new Error(`approval is ${row.status}`);
      if (row.principal_id === human.id) throw new Error("self-approval is forbidden");
      if (Date.parse(row.expires_at) <= now.getTime()) {
        this.transition(id, row.version, "requested", "expired", human.id, now);
        return null;
      }
      this.transition(id, row.version, "requested", decision, human.id, now);
      return this.get(id);
    });
    if (!result) throw new Error("approval expired");
    return result;
  }

  consume(input: {
    approvalId: string;
    actionDigest: string;
    principalId: string;
    now?: Date;
  }): ActionRecord {
    const now = input.now ?? new Date();
    const result = immediate(this.db, () => {
      const row = this.row(input.approvalId);
      if (row.status !== "approved") throw new Error(`approval is ${row.status}`);
      if (Date.parse(row.expires_at) <= now.getTime()) {
        this.transition(
          input.approvalId,
          row.version,
          "approved",
          "expired",
          input.principalId,
          now
        );
        return null;
      }
      if (row.principal_id !== input.principalId) {
        throw new Error("approval principal mismatch");
      }
      if (row.digest !== input.actionDigest) {
        throw new Error("approval action digest mismatch");
      }
      const action = actionFromRow(row);
      if (actionDigest(action) !== row.digest) {
        throw new Error("stored action digest mismatch");
      }
      this.transition(
        input.approvalId,
        row.version,
        "approved",
        "consumed",
        input.principalId,
        now
      );
      return action;
    });
    if (!result) throw new Error("approval expired");
    return result;
  }

  private row(id: string): JoinedRow {
    const row = this.db.prepare(`${JOIN_SQL} WHERE p.id = ?`).get(id) as JoinedRow | undefined;
    if (!row) throw new Error("approval not found");
    return row;
  }

  private transition(
    id: string,
    version: number,
    from: ApprovalStatus,
    to: ApprovalStatus,
    actorId: string,
    now: Date
  ): void {
    const result = this.db.prepare(`
      UPDATE approvals
      SET status = ?,
          decided_by = CASE WHEN ? IN ('approved', 'denied') THEN ? ELSE decided_by END,
          decided_at = CASE WHEN ? IN ('approved', 'denied') THEN ? ELSE decided_at END,
          consumed_at = CASE WHEN ? = 'consumed' THEN ? ELSE consumed_at END,
          version = version + 1
      WHERE id = ? AND status = ? AND version = ?
    `).run(
      to,
      to,
      actorId,
      to,
      now.toISOString(),
      to,
      now.toISOString(),
      id,
      from,
      version
    );
    if (result.changes !== 1) throw new Error("approval transition conflict");
    this.event(id, from, to, actorId, {});
  }

  private event(
    approvalId: string,
    from: ApprovalStatus | null,
    to: ApprovalStatus,
    actorId: string,
    detail: Record<string, unknown>
  ): void {
    this.db.prepare(`
      INSERT INTO approval_events(
        approval_id, from_status, to_status, actor_id, detail_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(approvalId, from, to, actorId, redactedJson(detail), new Date().toISOString());
  }
}
