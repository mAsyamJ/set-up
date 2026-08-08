import policy from "../../tools/policies/default.tool-policy.json" with { type: "json" };
import type { Principal } from "../auth/principal.js";
import { isSecretPath } from "./path-policy.js";

export type ToolRisk = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
export type ApprovalMode = "never" | "exact" | "unsupported";

type PolicyFile = {
  version: string;
  tools: Record<
    string,
    { risk: ToolRisk; default: "deny"; approval: ApprovalMode }
  >;
  profiles: Record<string, { allowedTools: string[] }>;
  forbiddenPatterns: string[];
};

const POLICY = policy as PolicyFile;

export function getToolPolicy(): PolicyFile {
  return POLICY;
}

export function getToolSpec(tool: string) {
  return POLICY.tools[tool];
}

export function checkToolAllowed(
  tool: string,
  args: Record<string, unknown>,
  principal: Principal
): { allowed: boolean; reason?: string } {
  const spec = POLICY.tools[tool];
  if (!spec) return { allowed: false, reason: `unknown tool: ${tool}` };

  const profile = principal.profile;
  const actor = POLICY.profiles[profile];
  if (!actor) return { allowed: false, reason: `unknown policy profile: ${profile}` };
  if (!actor.allowedTools.includes(tool)) {
    return { allowed: false, reason: `${tool} denied for profile ${profile}` };
  }

  const blob = JSON.stringify(args);
  for (const pattern of POLICY.forbiddenPatterns) {
    if (blob.includes(pattern)) {
      return { allowed: false, reason: `forbidden pattern: ${pattern}` };
    }
  }

  if (["repo.read", "repo.search", "rag.search", "workspace.write"].includes(tool)) {
    const candidate = String(args.path ?? args.query ?? "");
    if (candidate && isSecretPath(candidate)) {
      return { allowed: false, reason: "sensitive path denied (R5)" };
    }
  }

  return { allowed: true };
}
