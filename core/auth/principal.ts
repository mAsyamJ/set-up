import { randomUUID } from "node:crypto";

export type PrincipalKind =
  | "human"
  | "audit"
  | "cursor"
  | "hermes_operator"
  | "hermes_worker"
  | "system";

export type PolicyProfile =
  | "audit"
  | "cursor-interactive"
  | "hermes-operator"
  | "worker"
  | "human-operator";

export type Principal = Readonly<{
  id: string;
  kind: PrincipalKind;
  profile: PolicyProfile;
  sessionId: string;
  authenticationMethod: "fixed-entrypoint" | "lease-capability" | "tty-passphrase";
}>;

type FixedEntrypoint = "audit" | "cursor" | "hermes-operator";

const FIXED_PRINCIPALS: Record<FixedEntrypoint, Omit<Principal, "sessionId">> = {
  audit: {
    id: "harness:audit",
    kind: "audit",
    profile: "audit",
    authenticationMethod: "fixed-entrypoint",
  },
  cursor: {
    id: "agent:cursor-interactive",
    kind: "cursor",
    profile: "cursor-interactive",
    authenticationMethod: "fixed-entrypoint",
  },
  "hermes-operator": {
    id: "agent:hermes-operator",
    kind: "hermes_operator",
    profile: "hermes-operator",
    authenticationMethod: "fixed-entrypoint",
  },
};

export function fixedPrincipal(entrypoint: FixedEntrypoint, sessionId = randomUUID()): Principal {
  return Object.freeze({ ...FIXED_PRINCIPALS[entrypoint], sessionId });
}

export function workerPrincipal(workerId: string, sessionId = randomUUID()): Principal {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(workerId)) {
    throw new Error("invalid worker ID");
  }
  return Object.freeze({
    id: `worker:${workerId}`,
    kind: "hermes_worker",
    profile: "worker",
    sessionId,
    authenticationMethod: "lease-capability",
  });
}

export function humanPrincipal(operatorId: string, sessionId = randomUUID()): Principal {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(operatorId)) {
    throw new Error("invalid operator ID");
  }
  return Object.freeze({
    id: `human:${operatorId}`,
    kind: "human",
    profile: "human-operator",
    sessionId,
    authenticationMethod: "tty-passphrase",
  });
}
