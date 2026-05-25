import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectManifest } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type PlanStep = { agent: string; action: string };

export function loadTaskFile(taskPath: string): { path: string; content: string; title: string } {
  const content = fs.readFileSync(taskPath, "utf8");
  const title = content.match(/^#\s+(.+)/m)?.[1] ?? path.basename(taskPath, ".md");
  return { path: taskPath, content, title };
}

export function createPlan(manifest: ProjectManifest, task: { title: string }): PlanStep[] {
  const enabled = manifest.project?.name ? ["implementer", "qa", "security"] : ["implementer", "qa"];
  return [
    { agent: "architect", action: "validate scope against manifest" },
    { agent: "implementer", action: `implement: ${task.title}` },
    { agent: "qa", action: "run verify.run" },
    ...(enabled.includes("security") ? [{ agent: "security", action: "review diff" }] : []),
    { agent: "docs", action: "update task result" },
  ];
}

export function loadRegistry(harnessRoot: string) {
  const p = path.join(harnessRoot, "agents", "registry.json");
  return JSON.parse(fs.readFileSync(p, "utf8")) as {
    agents: Record<string, { file: string; allowed_tools?: string[]; handoffs?: string[] }>;
  };
}
