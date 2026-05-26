export type CursorMode = "agent" | "ask" | "plan";

const PROFILE_MODES: Record<string, CursorMode> = {
  "aegis-builder": "agent",
  "aegis-frontend": "agent",
  "aegis-backend-rpc": "agent",
  "aegis-devops": "agent",
  "aegis-tx-decoder": "agent",
  "aegis-orchestrator": "plan",
  "aegis-security": "ask",
  "aegis-qa": "agent",
  "aegis-pitch": "ask",
};

export function modeForProfile(assignee: string | undefined): CursorMode {
  if (!assignee) return "agent";
  return PROFILE_MODES[assignee] ?? "agent";
}

export function verifyPromptSuffix(assignee: string | undefined): string {
  if (assignee === "aegis-qa") {
    return "\n\nAfter review, run project verification commands from manifest if applicable. Do not git push.";
  }
  if (assignee === "aegis-security") {
    return "\n\nRead-only security review. Report findings; do not modify files unless critical.";
  }
  return "";
}
