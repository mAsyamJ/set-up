export type SourceKind =
  | "task"
  | "manifest"
  | "context"
  | "repo"
  | "obsidian"
  | "harness"
  | "trace";

/** Lower number = higher priority in retrieval ranking */
export const SOURCE_PRIORITY: Record<SourceKind, number> = {
  task: 1,
  manifest: 2,
  context: 3,
  repo: 4,
  obsidian: 5,
  harness: 6,
  trace: 7,
};

export function rankSource(kind: SourceKind): number {
  return SOURCE_PRIORITY[kind] ?? 99;
}
