import fs from "node:fs";
import path from "node:path";
import { HarnessStore, projectStateDir } from "../state/sqlite.js";

export function renderRunReport(projectRoot: string, runId?: string): string {
  const store = new HarnessStore(projectStateDir(projectRoot));
  const id = runId ?? store.getLatestRunId();
  if (!id) {
    store.close();
    return "No runs found";
  }
  const run = store.getRun(id) as Record<string, unknown> | undefined;
  const traces = store.getRunTraces(id);
  store.close();

  const lines = [
    `# Run report: ${id}`,
    "",
    `- Project: ${run?.project_root ?? "?"}`,
    `- Agent: ${run?.agent ?? "?"}`,
    `- Status: ${run?.status ?? "?"}`,
    `- Started: ${run?.started_at ?? "?"}`,
    `- Ended: ${run?.ended_at ?? "(running)"}`,
    "",
    "## Tool calls",
  ];
  for (const t of traces) {
    lines.push(`- [${t.ok ? "OK" : "FAIL"}] ${t.tool} @ ${t.createdAt}`);
  }
  return lines.join("\n");
}

export function appendEvent(projectRoot: string, event: Record<string, unknown>): void {
  const dir = projectStateDir(projectRoot);
  fs.mkdirSync(path.join(dir, "events"), { recursive: true });
  const file = path.join(dir, "events", `${new Date().toISOString().slice(0, 10)}.jsonl`);
  fs.appendFileSync(file, JSON.stringify({ ...event, ts: new Date().toISOString() }) + "\n");
}
