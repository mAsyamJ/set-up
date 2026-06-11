import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AuditAutomationConfig } from "./config.js";
import type { AuditRunState } from "./state.js";
import { ensureAuditStateDir } from "./state.js";

const execFileAsync = promisify(execFile);

function readFileSafe(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function countCandidateStatuses(markdown: string) {
  const counts: Record<string, number> = {};
  for (const match of markdown.matchAll(/\*\*Status:\*\*\s*([A-Za-z-]+)/g)) {
    const key = match[1].toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function countValidatedFindings(markdown: string): number {
  return (markdown.match(/^##\s+[A-Z0-9-]+:/gm) || []).length;
}

async function kanbanSnapshot(board: string): Promise<{ board: string; stats: string; list: string }> {
  try {
    const stats = await execFileAsync("hermes", ["kanban", "--board", board, "stats"], {
      timeout: 15000,
      env: process.env,
    });
    const list = await execFileAsync("hermes", ["kanban", "--board", board, "list"], {
      timeout: 15000,
      env: process.env,
    });
    return {
      board,
      stats: String(stats.stdout || "").trim(),
      list: String(list.stdout || "").trim(),
    };
  } catch {
    return {
      board,
      stats: "board unavailable",
      list: "",
    };
  }
}

function taskCounts(taskRoot: string) {
  const counts: Record<string, number> = {};
  for (const bucket of ["backlog", "active", "review", "done", "blocked"]) {
    const dir = path.join(taskRoot, bucket);
    counts[bucket] = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((name) => name.endsWith(".md")).length
      : 0;
  }
  return counts;
}

export async function generateAuditReport(
  projectRoot: string,
  cfg: AuditAutomationConfig,
  state: AuditRunState | null
) {
  const findings = readFileSafe(path.join(projectRoot, cfg.paths.findings));
  const candidates = readFileSafe(path.join(projectRoot, cfg.paths.candidates));
  const pocResults = readFileSafe(path.join(projectRoot, cfg.paths.pocResults));
  const dedupMap = readFileSafe(path.join(projectRoot, cfg.paths.dedupMap));
  const taskRoot = path.join(projectRoot, cfg.paths.taskRoot);
  const taskSummary = taskCounts(taskRoot);
  const kanban = await kanbanSnapshot(cfg.projectSlug);

  const data = {
    project: cfg.projectSlug,
    provider: cfg.provider,
    model: cfg.auditModel,
    status: state?.status || "idle",
    nextAttemptAt: state?.nextAttemptAt || null,
    summary: state?.summary || null,
    validatedFindings: countValidatedFindings(findings),
    candidateStatuses: countCandidateStatuses(candidates),
    taskSummary,
    kanban,
    notes: {
      latestPocLine: (pocResults.match(/^Result:.*$/m) || [null])[0],
      dedupDate: (dedupMap.match(/^Date:\s*(.+)$/m) || [null, null])[1],
    },
  };

  const lines = [
    `# Audit status: ${cfg.projectSlug}`,
    "",
    `- Provider: ${cfg.provider}`,
    `- Model: ${cfg.auditModel}`,
    `- Run state: ${data.status}`,
    `- Next retry: ${data.nextAttemptAt || "n/a"}`,
    `- Validated findings: ${data.validatedFindings}`,
    `- Candidate statuses: ${JSON.stringify(data.candidateStatuses)}`,
    `- Tasks: backlog=${taskSummary.backlog} active=${taskSummary.active} review=${taskSummary.review} blocked=${taskSummary.blocked}`,
    `- Kanban (${kanban.board}): ${kanban.stats || "unavailable"}`,
    state?.summary ? `- Last summary: ${state.summary}` : "",
    data.notes.latestPocLine ? `- Latest PoC note: ${data.notes.latestPocLine}` : "",
  ].filter(Boolean);

  const dir = ensureAuditStateDir(projectRoot);
  const mdPath = path.join(dir, "status-report.md");
  const jsonPath = path.join(dir, "status-report.json");
  fs.writeFileSync(mdPath, `${lines.join("\n")}\n`, "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  return {
    markdown: lines.join("\n"),
    data,
    mdPath,
    jsonPath,
  };
}

