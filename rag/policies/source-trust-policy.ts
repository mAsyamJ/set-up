import type { SourceKind } from "./source-priority.js";

export type TrustLabel = "TRUSTED" | "UNTRUSTED_CONTEXT";

/** Obsidian and external research are never system instructions */
export function trustLabelForSource(kind: SourceKind): TrustLabel {
  if (kind === "obsidian" || kind === "trace") return "UNTRUSTED_CONTEXT";
  return "TRUSTED";
}
