import { loadRegistry } from "./planner.js";

export function routeAgent(harnessRoot: string, stepAgent: string): {
  id: string;
  file: string;
  allowedTools: string[];
  handoffs: string[];
} {
  const reg = loadRegistry(harnessRoot);
  const agent = reg.agents[stepAgent] ?? reg.agents.implementer ?? reg.agents.backend;
  if (!agent) throw new Error(`unknown agent: ${stepAgent}`);
  return {
    id: stepAgent,
    file: agent.file,
    allowedTools: agent.allowed_tools ?? [],
    handoffs: agent.handoffs ?? [],
  };
}

export function nextHandoff(current: string, harnessRoot: string): string | null {
  const reg = loadRegistry(harnessRoot);
  const handoffs = reg.agents[current]?.handoffs ?? [];
  return handoffs[0] ?? null;
}
