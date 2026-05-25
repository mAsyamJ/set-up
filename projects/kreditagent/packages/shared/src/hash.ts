import { keccak256, toBytes } from "viem";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(",")}}`;
}

export function hashObject(value: unknown): `0x${string}` {
  return keccak256(toBytes(stableStringify(value)));
}

export function pseudoSignature(value: unknown): `0x${string}` {
  return hashObject({ purpose: "kreditagent-demo-signature", value });
}
