import { randomUUID } from "node:crypto";
import type { Principal } from "./auth/principal.js";

export type ToolResult<T = unknown> = {
  ok: boolean;
  tool: string;
  data?: T;
  error?: string;
};

export type ProjectManifest = {
  schema?: string;
  harness?: { disposableCanary?: boolean };
  project?: { name?: string; type?: string; root?: string; description?: string };
  paths?: { product?: string[]; docs?: string[]; tasks?: string; state?: string };
  commands?: Record<string, string>;
  commandIds?: Record<string, string>;
  rules?: { noSecrets?: boolean; requireVerification?: boolean; requireTaskFile?: boolean };
};

export type GatewayContext = {
  projectRoot: string;
  harnessRoot: string;
  runId: string;
  workspaceId: string;
  principal: Principal;
  leaseToken?: string;
};

export function createRunId(): string {
  return `run_${randomUUID()}`;
}
