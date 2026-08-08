#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ToolGateway } from "./tool-gateway.js";
import { HarnessStore, projectStateDir } from "../../core/state/sqlite.js";
import { createRunId } from "../../core/types.js";
import { createHash } from "node:crypto";
import { redactedJson } from "../../core/security/redaction.js";
import { fixedPrincipal } from "../../core/auth/principal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(__dirname, "../..");

async function main() {
  const [,, projectRoot, tool, ...rest] = process.argv;
  if (!projectRoot || !tool) {
    console.error("Usage: cli.ts <project-root> <tool> [json-args]");
    process.exit(1);
  }
  const absProject = path.resolve(projectRoot);
  const runId = createRunId();
  const store = new HarnessStore(projectStateDir(absProject));
  store.startRun(runId, absProject);
  const gw = new ToolGateway({
    projectRoot: absProject,
    harnessRoot,
    runId,
    workspaceId: createHash("sha256").update(absProject).digest("hex").slice(0, 32),
    principal: fixedPrincipal("audit")
  });
  let args: Record<string, unknown> = {};
  const raw = rest.join(" ").trim();
  if (raw && raw !== "{}") args = JSON.parse(raw) as Record<string, unknown>;
  const t0 = Date.now();
  const result = await gw.call(tool, args);
  const durationMs = Date.now() - t0;
  store.logTrace({
    id: `${runId}_${tool}`,
    runId,
    tool,
    args: redactedJson(args),
    result: redactedJson(result),
    ok: result.ok,
  });
  store.logToolCall({
    id: `${runId}_${tool}_tc`,
    runId,
    tool,
    argsHash: createHash("sha256").update(redactedJson(args)).digest("hex").slice(0, 16),
    durationMs,
    ok: result.ok,
    createdAt: new Date().toISOString(),
  });
  store.endRun(runId, result.ok ? "completed" : "failed");
  gw.close();
  store.close();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
