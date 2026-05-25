import policy from "../../tools/policies/default.tool-policy.json" with { type: "json" };
import { isSecretPath } from "./path-policy.js";

export type ToolRisk = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";

type PolicyFile = {
  tools: Record<string, { risk: ToolRisk; default: "allow" | "deny" }>;
  forbiddenPatterns: string[];
  allowedShellCommands: string[];
};

const POLICY = policy as PolicyFile;

export function getToolPolicy() {
  return POLICY;
}

export function checkToolAllowed(
  tool: string,
  args?: Record<string, unknown>
): { allowed: boolean; reason?: string } {
  const spec = POLICY.tools[tool];
  if (!spec) return { allowed: false, reason: `unknown tool: ${tool}` };
  if (spec.default === "deny") return { allowed: false, reason: `${tool} denied by default (${spec.risk})` };

  const blob = JSON.stringify(args ?? {});
  for (const pat of POLICY.forbiddenPatterns) {
    if (blob.includes(pat)) return { allowed: false, reason: `forbidden pattern: ${pat}` };
  }

  if (tool === "repo.read" || tool === "repo.search" || tool === "rag.search") {
    const rel = String(args?.path ?? args?.query ?? "");
    if (rel && isSecretPath(rel)) return { allowed: false, reason: "secrets path denied (R5)" };
  }

  return { allowed: true };
}

export function isCommandAllowed(cmd: string): boolean {
  if (POLICY.forbiddenPatterns.some((p) => cmd.includes(p))) return false;
  return POLICY.allowedShellCommands.some((allowed) => cmd.trim().startsWith(allowed));
}
