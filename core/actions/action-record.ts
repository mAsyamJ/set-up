import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { assertBoundedJson } from "../security/bounded-json.js";
import { containsSensitiveData } from "../security/redaction.js";

export type ActionRisk = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";

export type ActionRecord = Readonly<{
  id: string;
  principalId: string;
  taskId: string | null;
  projectId: string;
  workspacePath: string;
  toolId: string;
  commandId: string | null;
  arguments: Readonly<Record<string, unknown>>;
  risk: ActionRisk;
  policyVersion: string;
  nonce: string;
  createdAt: string;
  expiresAt: string;
}>;

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalValue(item)])
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("action arguments cannot contain non-finite numbers");
  }
  if (value === undefined) throw new Error("action arguments cannot contain undefined");
  return value;
}

export function canonicalActionJson(action: ActionRecord): string {
  return JSON.stringify({
    id: action.id,
    principalId: action.principalId,
    taskId: action.taskId,
    projectId: action.projectId,
    workspacePath: action.workspacePath,
    toolId: action.toolId,
    commandId: action.commandId,
    arguments: canonicalValue(action.arguments),
    risk: action.risk,
    policyVersion: action.policyVersion,
    nonce: action.nonce,
    createdAt: action.createdAt,
    expiresAt: action.expiresAt,
  });
}

export function canonicalArgumentsJson(argumentsValue: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(canonicalValue(argumentsValue));
}

export function actionDigest(action: ActionRecord): string {
  return createHash("sha256").update(canonicalActionJson(action)).digest("hex");
}

export function createActionRecord(input: {
  principalId: string;
  taskId?: string | null;
  projectId: string;
  workspacePath: string;
  toolId: string;
  commandId?: string | null;
  arguments?: Record<string, unknown>;
  risk: ActionRisk;
  policyVersion: string;
  ttlMs?: number;
  now?: Date;
}): ActionRecord {
  const now = input.now ?? new Date();
  const ttlMs = input.ttlMs ?? 10 * 60_000;
  if (ttlMs < 1_000 || ttlMs > 24 * 60 * 60_000) throw new Error("invalid approval TTL");
  assertBoundedJson(input.arguments ?? {}, "action arguments", {
    maxBytes: 1_100_000,
    maxDepth: 8,
    maxNodes: 2_048,
    maxStringBytes: 1_000_000,
  });
  if (containsSensitiveData(input.arguments ?? {})) {
    throw new Error("secret-bearing action arguments are not approvable");
  }
  const workspacePath = path.resolve(input.workspacePath);
  return Object.freeze({
    id: `action_${randomUUID()}`,
    principalId: input.principalId,
    taskId: input.taskId ?? null,
    projectId: input.projectId,
    workspacePath,
    toolId: input.toolId,
    commandId: input.commandId ?? null,
    arguments: Object.freeze(canonicalValue(input.arguments ?? {}) as Record<string, unknown>),
    risk: input.risk,
    policyVersion: input.policyVersion,
    nonce: randomUUID(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  });
}
