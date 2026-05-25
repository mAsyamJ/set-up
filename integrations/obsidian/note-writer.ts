import fs from "node:fs";
import path from "node:path";
import { buildFrontmatter } from "./frontmatter.js";
import { loadObsidianConfig, resolveVaultPath, VAULT_DIRS } from "./vault-config.js";

export function scaffoldVault(projectRoot: string): string {
  const cfg = loadObsidianConfig(projectRoot);
  if (!cfg) throw new Error("missing .harness/obsidian.config.json");
  const vault = resolveVaultPath(projectRoot, cfg);
  for (const dir of VAULT_DIRS) {
    fs.mkdirSync(path.join(vault, dir), { recursive: true });
  }
  return vault;
}

export function writeNote(
  vaultRoot: string,
  relPath: string,
  frontmatter: Record<string, unknown>,
  body: string,
  allowOverwrite = false
): string {
  const abs = path.join(vaultRoot, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (fs.existsSync(abs) && !allowOverwrite) {
    throw new Error(`note exists (modify denied): ${relPath}`);
  }
  const content = buildFrontmatter(frontmatter) + body;
  fs.writeFileSync(abs, content, "utf8");
  return abs;
}

export function writeProjectIndex(projectRoot: string): string {
  const cfg = loadObsidianConfig(projectRoot)!;
  const vault = scaffoldVault(projectRoot);
  const rel = cfg.projectNotePath;
  return writeNote(
    vault,
    rel,
    {
      type: "project-index",
      project: cfg.projectSlug,
      source: "agent-harness",
      date: new Date().toISOString().slice(0, 10),
      tags: ["agent-harness", cfg.projectSlug],
    },
    `# ${cfg.projectDisplayName}\n\nProject adapter index. Executable truth lives in the repo.\n`,
    cfg.writePolicy?.allowUpdateIndex ?? true
  );
}

export function writeRunSummary(
  projectRoot: string,
  runId: string,
  summary: { goal?: string; summary?: string; files?: string[]; next?: string[] }
): string {
  const cfg = loadObsidianConfig(projectRoot)!;
  const vault = resolveVaultPath(projectRoot, cfg);
  const date = new Date().toISOString().slice(0, 10);
  const rel = `06-Runs/${date}-${runId.slice(0, 20)}.md`;
  const body = [
    `# Agent Run — ${runId}`,
    "",
    "## Goal",
    summary.goal ?? "(none)",
    "",
    "## Summary",
    summary.summary ?? "(none)",
    "",
    "## Files changed",
    ...(summary.files ?? []).map((f) => `- ${f}`),
    "",
    "## Next actions",
    ...(summary.next ?? []).map((a) => `- ${a}`),
  ].join("\n");
  return writeNote(vault, rel, {
    type: "agent-run",
    project: cfg.projectSlug,
    date,
    agent: "orchestrator",
    status: "completed",
    source: "agent-harness",
    task: runId,
    tags: ["agent-harness", "run", cfg.projectSlug],
  }, body);
}

export function writeAdr(projectRoot: string, title: string, context: string, decision: string): string {
  const cfg = loadObsidianConfig(projectRoot)!;
  const vault = resolveVaultPath(projectRoot, cfg);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const rel = `05-Decisions/ADR-${slug}.md`;
  const body = [`# ADR — ${title}`, "", "## Context", context, "", "## Decision", decision, ""].join("\n");
  return writeNote(vault, rel, {
    type: "adr",
    status: "proposed",
    project: cfg.projectSlug,
    date: new Date().toISOString().slice(0, 10),
    tags: ["architecture", cfg.projectSlug],
  }, body);
}

export function buildObsidianUri(vaultName: string, filePath: string): string {
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
}
