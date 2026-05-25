export type ToolResult<T = unknown> = {
  ok: boolean;
  tool: string;
  data?: T;
  error?: string;
};

export type ProjectManifest = {
  schema?: string;
  project?: { name?: string; type?: string; root?: string; description?: string };
  paths?: { product?: string[]; docs?: string[]; tasks?: string; state?: string };
  commands?: Record<string, string>;
  rules?: { noSecrets?: boolean; requireVerification?: boolean; requireTaskFile?: boolean };
};

export type GatewayContext = {
  projectRoot: string;
  harnessRoot: string;
  runId: string;
  agentId?: string;
};

export function createRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
