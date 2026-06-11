import fs from "node:fs";
import path from "node:path";

export type AuditWriteMode = "candidate-writer" | "reports-only" | "full-autopilot";

export type AuditAutomationConfig = {
  projectSlug: string;
  provider: "openai-codex" | "cursor-composer-2" | "kiro-current";
  interactiveModel: string;
  auditModel: string;
  resumeIntervalSec: number;
  statusCron: string;
  delivery: "origin" | "local";
  writeMode: AuditWriteMode;
  paths: {
    agentRole: string;
    findings: string;
    candidates: string;
    pocResults: string;
    dedupMap: string;
    workflowRoot: string;
    taskRoot: string;
  };
};

export function configPath(projectRoot: string): string {
  return path.join(projectRoot, ".harness", "audit-automation.json");
}

function rel(...parts: string[]) {
  return path.join(...parts);
}

export function defaultConfig(projectRoot: string): AuditAutomationConfig {
  const slug = path.basename(projectRoot);
  const isMidnight = slug === "midnight-audit";
  return {
    projectSlug: slug,
    provider: "openai-codex",
    interactiveModel: process.env.OPENAI_CODEX_MODEL_INTERACTIVE || "gpt-5.1-codex",
    auditModel: process.env.OPENAI_CODEX_MODEL_AUDIT || "gpt-5.1-codex-max",
    resumeIntervalSec: Number(process.env.AEGIS_AUDIT_RESUME_INTERVAL_SEC || 300),
    statusCron: process.env.AEGIS_AUDIT_STATUS_CRON || "0 * * * *",
    delivery: "origin",
    writeMode: "candidate-writer",
    paths: isMidnight
      ? {
          agentRole: rel("audits", "asyam", ".AGENTROLE.md"),
          findings: rel("audits", "asyam", "findings", "findings.md"),
          candidates: rel("audits", "asyam", "candidates", "CANDIDATES.md"),
          pocResults: rel("audits", "asyam", "workflow", "POC_RESULTS.md"),
          dedupMap: rel("audits", "asyam", "workflow", "03_DEDUP_MAP.md"),
          workflowRoot: rel("audits", "asyam", "workflow"),
          taskRoot: rel(".harness", "tasks"),
        }
      : {
          agentRole: rel("AGENTS.md"),
          findings: rel(".harness", "audit", "findings.md"),
          candidates: rel(".harness", "audit", "candidates.md"),
          pocResults: rel(".harness", "audit", "poc-results.md"),
          dedupMap: rel(".harness", "audit", "dedup.md"),
          workflowRoot: rel(".harness", "audit"),
          taskRoot: rel(".harness", "tasks"),
        },
  };
}

export function readConfig(projectRoot: string): AuditAutomationConfig {
  const file = configPath(projectRoot);
  if (!fs.existsSync(file)) {
    return defaultConfig(projectRoot);
  }
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<AuditAutomationConfig>;
  const base = defaultConfig(projectRoot);
  return {
    ...base,
    ...parsed,
    paths: {
      ...base.paths,
      ...(parsed.paths || {}),
    },
  };
}

export function writeConfig(projectRoot: string, cfg: AuditAutomationConfig): void {
  const file = configPath(projectRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
}

