import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { readConfig, type AuditAutomationConfig } from "./config.js";
import {
  archiveRun,
  ensureAuditStateDir,
  readCurrentRun,
  writeCurrentRun,
  type AuditRunState,
} from "./state.js";
import { generateAuditReport } from "./report.js";

const require = createRequire(import.meta.url);
const openaiCodex = require("../../scripts/lib/openai-codex-client.cjs") as {
  createResponse: (args: Record<string, unknown>) => Promise<{ id: string | null; status: string; outputText: string }>;
  pollResponse: (id: string) => Promise<{ id: string | null; status: string; outputText: string }>;
};

function nowIso() {
  return new Date().toISOString();
}

function readSnippet(projectRoot: string, relPath: string, maxChars = 6000): string {
  try {
    return fs.readFileSync(path.join(projectRoot, relPath), "utf8").slice(0, maxChars);
  } catch {
    return "";
  }
}

function buildPrompt(projectRoot: string, cfg: AuditAutomationConfig): string {
  return [
    "You are running an automated white-hat smart contract audit continuation.",
    `Project: ${cfg.projectSlug}`,
    `Write mode: ${cfg.writeMode}`,
    "Rules:",
    "- Do not claim a validated finding without proof artifacts and human review.",
    "- Prefer candidate notes, PoC ideas, workflow deltas, and next-job suggestions.",
    "- Respect the local audit workflow and dedup rules.",
    "",
    "Agent role:",
    readSnippet(projectRoot, cfg.paths.agentRole),
    "",
    "Validated findings:",
    readSnippet(projectRoot, cfg.paths.findings),
    "",
    "Candidates:",
    readSnippet(projectRoot, cfg.paths.candidates),
    "",
    "PoC results:",
    readSnippet(projectRoot, cfg.paths.pocResults),
    "",
    "Dedup map:",
    readSnippet(projectRoot, cfg.paths.dedupMap),
    "",
    "Return:",
    "1. Current audit focus",
    "2. New candidate ideas or closures",
    "3. Suggested next jobs",
    "4. Any candidate-writer draft content in Markdown",
  ].join("\n");
}

function computeRetryAt(cfg: AuditAutomationConfig, err: unknown): string {
  const retryMs =
    typeof err === "object" && err && "openai" in err && (err as { openai?: { retryMs?: number } }).openai?.retryMs
      ? (err as { openai?: { retryMs?: number } }).openai!.retryMs!
      : cfg.resumeIntervalSec * 1000;
  return new Date(Date.now() + retryMs).toISOString();
}

export function shouldRetryProviderError(err: unknown): boolean {
  return !(
    typeof err === "object" &&
    err &&
    "openai" in err &&
    (err as { openai?: { retryable?: boolean } }).openai?.retryable === false
  );
}

function providerFailureState(
  state: AuditRunState,
  cfg: AuditAutomationConfig,
  err: unknown
): AuditRunState {
  const message = String((err as Error)?.message || err);
  const retryable = shouldRetryProviderError(err);
  return {
    ...state,
    status: retryable ? "waiting_rate_limit" : "blocked",
    updatedAt: nowIso(),
    nextAttemptAt: retryable ? computeRetryAt(cfg, err) : null,
    retryReason: message,
    summary: retryable ? `waiting for Codex retry: ${message}` : `Codex blocked: ${message}`,
  };
}

function candidateDraftDir(projectRoot: string, cfg: AuditAutomationConfig) {
  return path.join(projectRoot, cfg.paths.workflowRoot, "automation");
}

function writeCandidateDraft(projectRoot: string, cfg: AuditAutomationConfig, runId: string, text: string) {
  const dir = candidateDraftDir(projectRoot, cfg);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}-${runId}.md`);
  fs.writeFileSync(file, `${text.trim()}\n`, "utf8");
  return file;
}

async function finalizeRun(
  projectRoot: string,
  cfg: AuditAutomationConfig,
  state: AuditRunState,
  outputText: string
) {
  let notePath: string | null = null;
  if (cfg.writeMode === "candidate-writer" || cfg.writeMode === "full-autopilot") {
    notePath = writeCandidateDraft(projectRoot, cfg, state.runId, outputText);
  }
  const next: AuditRunState = {
    ...state,
    status: "completed",
    updatedAt: nowIso(),
    responseId: state.responseId,
    nextAttemptAt: null,
    retryReason: null,
    notePath,
    summary: outputText.split("\n").slice(0, 3).join(" ").slice(0, 300) || "audit cycle completed",
  };
  archiveRun(projectRoot, next);
  const report = await generateAuditReport(projectRoot, cfg, next);
  return { state: next, report };
}

export async function runAuditCycle(projectRoot: string, opts: { resumeOnly?: boolean } = {}) {
  ensureAuditStateDir(projectRoot);
  const cfg = readConfig(projectRoot);
  if (cfg.provider !== "openai-codex") {
    const blocked: AuditRunState = {
      runId: `${cfg.projectSlug}-provider-blocked`,
      status: "blocked",
      provider: cfg.provider,
      model: cfg.auditModel,
      startedAt: nowIso(),
      updatedAt: nowIso(),
      responseId: null,
      nextAttemptAt: null,
      retryReason: null,
      notePath: null,
      summary: `audit automation currently supports openai-codex only; configured provider=${cfg.provider}`,
    };
    writeCurrentRun(projectRoot, blocked);
    const report = await generateAuditReport(projectRoot, cfg, blocked);
    return { state: blocked, report, action: "provider-blocked" };
  }
  const current = readCurrentRun(projectRoot);

  if (current?.status === "waiting_rate_limit" && current.nextAttemptAt) {
    if (Date.now() < Date.parse(current.nextAttemptAt)) {
      const report = await generateAuditReport(projectRoot, cfg, current);
      return { state: current, report, action: "waiting-rate-limit" };
    }
  }

  if (current?.status === "waiting_background" && current.responseId) {
    try {
      const polled = await openaiCodex.pollResponse(current.responseId);
      if (polled.status === "completed") {
        const report = await finalizeRun(projectRoot, cfg, current, polled.outputText || "");
        return { ...report, action: "completed-background" };
      }
      const next = { ...current, updatedAt: nowIso(), summary: `background status=${polled.status}` };
      writeCurrentRun(projectRoot, next);
      const report = await generateAuditReport(projectRoot, cfg, next);
      return { state: next, report, action: "still-running" };
    } catch (err) {
      const next = providerFailureState(current, cfg, err);
      writeCurrentRun(projectRoot, next);
      const report = await generateAuditReport(projectRoot, cfg, next);
      return {
        state: next,
        report,
        action: next.status === "blocked" ? "blocked-background" : "rate-limited-background",
      };
    }
  }

  if (opts.resumeOnly) {
    const report = await generateAuditReport(projectRoot, cfg, current);
    return { state: current, report, action: "resume-only-noop" };
  }

  const runId = `${cfg.projectSlug}-${randomUUID().slice(0, 8)}`;
  const running: AuditRunState = {
    runId,
    status: "running",
    provider: cfg.provider,
    model: cfg.auditModel,
    startedAt: nowIso(),
    updatedAt: nowIso(),
    responseId: null,
    nextAttemptAt: null,
    retryReason: null,
    notePath: null,
    summary: "starting audit cycle",
  };
  writeCurrentRun(projectRoot, running);

  try {
    const created = await openaiCodex.createResponse({
      prompt: buildPrompt(projectRoot, cfg),
      model: cfg.auditModel,
      background: true,
      kind: "audit",
      metadata: {
        project: cfg.projectSlug,
        runId,
        source: "audit-automation",
      },
    });
    const next: AuditRunState = {
      ...running,
      status: created.status === "completed" ? "reporting" : "waiting_background",
      updatedAt: nowIso(),
      responseId: created.id,
      summary:
        created.status === "completed"
          ? "background audit completed immediately"
          : `background audit queued (${created.id || "no-id"})`,
    };
    writeCurrentRun(projectRoot, next);
    if (created.status === "completed") {
      const report = await finalizeRun(projectRoot, cfg, next, created.outputText || "");
      return { ...report, action: "completed-immediate" };
    }
    const report = await generateAuditReport(projectRoot, cfg, next);
    return { state: next, report, action: "started-background" };
  } catch (err) {
    const next = providerFailureState(running, cfg, err);
    writeCurrentRun(projectRoot, next);
    const report = await generateAuditReport(projectRoot, cfg, next);
    return {
      state: next,
      report,
      action: next.status === "blocked" ? "blocked-create" : "rate-limited-create",
    };
  }
}
