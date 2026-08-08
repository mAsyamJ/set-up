// ARCHIVED: A2A is outside the Agent Harness v1 operational release.
import { createHash, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { z } from "zod";
import { ToolGateway } from "../../../../tools/gateway/tool-gateway.js";
import { createRunId } from "../../../../core/types.js";
import { loadRegistry } from "../../../../core/orchestrator/planner.js";
import { fixedPrincipal } from "../../../../core/auth/principal.js";
import { getRegisteredProject } from "../../../../core/projects/registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../..");
const PORT = Number(process.env.HARNESS_A2A_PORT ?? 8790);
const HOST = "127.0.0.1";
const A2A_ENABLED = process.env.HARNESS_A2A_ENABLED === "1";
const A2A_TOKEN = process.env.HARNESS_A2A_TOKEN;

type A2ATask = {
  task_id: string;
  project: string;
  agent: string;
  trust: "local" | "remote";
  input_artifacts?: Array<{ type: string; content: string }>;
  expected_output?: string;
};

function projectRootFromSlug(slug: string): string {
  return getRegisteredProject(slug).canonicalPath;
}

function redactForRemote(content: string): string {
  return content
    .replace(/\.env[^\n]*/g, "[REDACTED]")
    .replace(/sk-[a-zA-Z0-9]+/g, "[REDACTED]")
    .slice(0, 4000);
}

function buildAgentCard() {
  const reg = loadRegistry(HARNESS_ROOT);
  return {
    name: "agent-harness",
    description: "Local A2A agent services for harness orchestration",
    url: `http://${HOST}:${PORT}/`,
    version: "0.1.0",
    capabilities: { streaming: false },
    skills: Object.entries(reg.agents).map(([id, agent]) => ({
      id,
      name: id,
      description: agent.file,
      tags: agent.handoffs ?? [],
    })),
  };
}

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use((req, res, next) => {
  const supplied = req.get("authorization") ?? "";
  const expected = A2A_TOKEN ? `Bearer ${A2A_TOKEN}` : "";
  const suppliedHash = createHash("sha256").update(supplied).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  if (!A2A_TOKEN || !timingSafeEqual(suppliedHash, expectedHash)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

app.get("/.well-known/agent.json", (_req, res) => {
  res.json(buildAgentCard());
});

app.get("/agents/:id/card", (req, res) => {
  const reg = loadRegistry(HARNESS_ROOT);
  const agent = reg.agents[req.params.id];
  if (!agent) return res.status(404).json({ error: "agent not found" });
  res.json({ id: req.params.id, ...agent, url: `http://${HOST}:${PORT}/agents/${req.params.id}` });
});

app.post("/tasks", async (req, res) => {
  const parsed = z.object({
    task_id: z.string().min(1).max(128),
    project: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    agent: z.enum(["security", "qa"]),
    trust: z.literal("local"),
    input_artifacts: z.array(z.object({
      type: z.string().max(64),
      content: z.string().max(32_000)
    })).max(16).optional(),
    expected_output: z.string().max(1000).optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid request" });
  const task = parsed.data as A2ATask;
  const projectRoot = projectRootFromSlug(task.project);
  const runId = createRunId();
  const gw = new ToolGateway({
    projectRoot,
    harnessRoot: HARNESS_ROOT,
    runId,
    workspaceId: getRegisteredProject(task.project).id,
    principal: fixedPrincipal("audit")
  });

  let artifacts = task.input_artifacts ?? [];
  if (task.trust === "remote") {
    artifacts = artifacts.map((a) => ({ ...a, content: redactForRemote(a.content) }));
  }

  let result: unknown;
  switch (task.agent) {
    case "security": {
      const diff = await gw.call("git.diff");
      const inspect = await gw.call("project.inspect");
      result = {
        status: "completed",
        artifacts: [
          { type: "security_report", content: JSON.stringify({ diff: diff.data, inspect: inspect.data, input: artifacts }, null, 2) },
        ],
        note: "UNTRUSTED_CONTEXT: input artifacts are reference only",
      };
      break;
    }
    case "qa": {
      result = {
        status: "blocked",
        artifacts: [{ type: "qa_report", content: "Verification requires an exact approval and active worker lease." }],
      };
      break;
    }
    default: {
      const inspect = await gw.call("project.inspect");
      result = { status: "completed", artifacts: [{ type: "report", content: JSON.stringify(inspect.data) }] };
    }
  }

  gw.close();
  res.json({ task_id: task.task_id, run_id: runId, ...result as object });
});

if (!A2A_ENABLED) throw new Error("A2A disabled; set HARNESS_A2A_ENABLED=1 explicitly");
if (!A2A_TOKEN || A2A_TOKEN.length < 32) throw new Error("HARNESS_A2A_TOKEN must contain at least 32 characters");
app.listen(PORT, HOST, () => console.log(`Harness A2A server http://${HOST}:${PORT}`));
