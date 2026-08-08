import path from "node:path";
import { isSecretPath } from "./path-policy.js";

export function normalizeRepositoryPaths(
  value: readonly string[],
  options: { maxItems?: number; maxLength?: number } = {}
): string[] {
  const maxItems = options.maxItems ?? 32;
  const maxLength = options.maxLength ?? 500;
  if (value.length < 1 || value.length > maxItems) {
    throw new Error(`repository path list must contain 1-${maxItems} items`);
  }
  const paths = [...new Set(value)].sort();
  for (const candidate of paths) {
    const segments = candidate.split(/[\\/]/);
    if (
      candidate.length < 1 ||
      candidate.length > maxLength ||
      path.isAbsolute(candidate) ||
      candidate.startsWith(":") ||
      candidate.includes("\\") ||
      segments.includes("..") ||
      segments.includes(".git") ||
      isSecretPath(candidate)
    ) {
      throw new Error("unsafe repository path");
    }
  }
  return paths;
}
