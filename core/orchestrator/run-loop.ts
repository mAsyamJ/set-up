import path from "node:path";
import { fileURLToPath } from "node:url";
import { ToolGateway } from "../../tools/gateway/tool-gateway.js";
import { HarnessStore, projectStateDir } from "../state/sqlite.js";
import { createRunId } from "../types.js";
import { loadManifest } from "../../tools/gateway/tool-gateway.js";
import { createPlan, loadTaskFile } from "./planner.js";
import { dispatchStep, triggerParallelReview } from "./dispatcher.js";
import { parallelReviewFromCitations, allReviewsPassed } from "./reviewer.js";
import { appendEvent } from "../observability/run-report.js";
import { writeRunSummary } from "../../integrations/obsidian/note-writer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../..");

export type RunLoopOptions = {
  taskFile: string;
  skipVerify?: boolean;
};

export async function runSupervisorLoop(projectRoot: string, opts: RunLoopOptions): Promise<{ runId: string; ok: boolean }> {
  const runId = createRunId();
  const store = new HarnessStore(projectStateDir(projectRoot));
  store.startRun(runId, projectRoot, "orchestrator", opts.taskFile);
  appendEvent(projectRoot, { type: "run.start", runId, task: opts.taskFile });

  const gw = new ToolGateway({ projectRoot, harnessRoot: HARNESS_ROOT, runId });
  const task = loadTaskFile(path.resolve(projectRoot, opts.taskFile));
  const manifest = loadManifest(projectRoot);
  const plan = createPlan(manifest, task);

  let ok = true;
  for (const step of plan) {
    const disp = dispatchStep(HARNESS_ROOT, step);
    appendEvent(projectRoot, { type: "dispatch", runId, agent: disp.agent, action: disp.note });

    if (disp.agent === "implementer" || step.agent === "implementer") {
      await gw.call("project.inspect");
    }
    if (step.agent === "qa" && !opts.skipVerify) {
      const v = await gw.call("verify.run", { commands: ["typecheck", "test"] });
      if (!v.ok) ok = false;
    }
  }

  const rag = await gw.call("rag.search", { query: task.title });
  const citations = (rag.data as { citations?: unknown[] })?.citations ?? [];
  const reviews = parallelReviewFromCitations(citations as never[]);
  if (!allReviewsPassed(reviews)) ok = false;

  if (ok) {
    await triggerParallelReview(projectRoot, opts.taskFile);
    try {
      writeRunSummary(projectRoot, runId, { goal: task.title, summary: "Supervisor loop completed", next: ["Human review"] });
    } catch { /* obsidian optional */ }
  }

  store.endRun(runId, ok ? "completed" : "failed");
  store.close();
  appendEvent(projectRoot, { type: "run.end", runId, ok });
  return { runId, ok };
}
