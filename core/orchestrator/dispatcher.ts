import { routeAgent } from "./router.js";
import type { PlanStep } from "./planner.js";

export type DispatchResult = {
  agent: string;
  tools: string[];
  note: string;
};

export function dispatchStep(harnessRoot: string, step: PlanStep): DispatchResult {
  const routed = routeAgent(harnessRoot, step.agent === "implementer" ? "implementer" : step.agent);
  const tools = routed.allowedTools.length ? routed.allowedTools : ["project.inspect", "verify.run"];
  return { agent: routed.id, tools, note: step.action };
}

export async function triggerParallelReview(projectRoot: string, taskFile: string): Promise<void> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const script = process.env.AGENT_HARNESS_HOME
    ? `${process.env.AGENT_HARNESS_HOME}/scripts/harness-parallel-review.sh`
    : "";
  if (script) {
    await promisify(execFile)("bash", [script, taskFile], { env: { ...process.env, AEGIS_RPC_ROOT: projectRoot } }).catch(() => {});
  }
}
