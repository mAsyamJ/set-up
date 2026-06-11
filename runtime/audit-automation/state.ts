import fs from "node:fs";
import path from "node:path";

export type AuditRunStatus =
  | "idle"
  | "running"
  | "waiting_background"
  | "waiting_rate_limit"
  | "reporting"
  | "completed"
  | "blocked";

export type AuditRunState = {
  runId: string;
  status: AuditRunStatus;
  provider: string;
  model: string;
  startedAt: string;
  updatedAt: string;
  responseId: string | null;
  nextAttemptAt: string | null;
  retryReason: string | null;
  notePath: string | null;
  summary: string | null;
};

export function auditStateDir(projectRoot: string): string {
  return path.join(projectRoot, ".harness", "state", "audit-automation");
}

export function ensureAuditStateDir(projectRoot: string): string {
  const dir = auditStateDir(projectRoot);
  fs.mkdirSync(path.join(dir, "history"), { recursive: true });
  fs.mkdirSync(path.join(dir, "runs"), { recursive: true });
  return dir;
}

export function currentRunPath(projectRoot: string): string {
  return path.join(auditStateDir(projectRoot), "current-run.json");
}

export function statusPath(projectRoot: string): string {
  return path.join(auditStateDir(projectRoot), "status.json");
}

export function readCurrentRun(projectRoot: string): AuditRunState | null {
  const file = currentRunPath(projectRoot);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as AuditRunState;
}

export function writeCurrentRun(projectRoot: string, state: AuditRunState): void {
  ensureAuditStateDir(projectRoot);
  fs.writeFileSync(currentRunPath(projectRoot), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  fs.writeFileSync(statusPath(projectRoot), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function archiveRun(projectRoot: string, state: AuditRunState): void {
  const dir = ensureAuditStateDir(projectRoot);
  fs.writeFileSync(
    path.join(dir, "history", `${state.runId}.json`),
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8"
  );
  writeCurrentRun(projectRoot, state);
}

