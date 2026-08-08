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

export async function triggerParallelReview(
  _projectRoot: string,
  _taskFile: string
): Promise<never> {
  throw new Error(
    "legacy parallel review is disabled; review requires the lease-bound task workflow"
  );
}
