import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { ToolGateway } from "../../../../tools/gateway/tool-gateway.js";
import { createRunId } from "../../../../core/types.js";
import { loadRegistry } from "../../../../core/orchestrator/planner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../..");
const PORT = Number(process.env.HARNESS_A2A_PORT ?? 8790);
const HOST = "127.0.0.1";

type A2ATask = {
  task_id: string;
  project: string;
  agent: string;
  trust: "local" | "remote";
  input_artifacts?: Array<{ type: string; content: string }>;
  expected_output?: string;
};

function projectRootFromSlug(slug: string): string {
  const env = process.env.AEGIS_RPC_ROOT ?? process.env.AEGIS_WORKSPACE;
  if (env) return env;
  return path.join(HARNESS_ROOT, "projects", slug);
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
app.use(express.json({ limit: "5mb" }));

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
  const task = req.body as A2ATask;
  const projectRoot = projectRootFromSlug(task.project);
  const runId = createRunId();
  const gw = new ToolGateway({ projectRoot, harnessRoot: HARNESS_ROOT, runId, agentId: task.agent });

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
      const verify = await gw.call("verify.run", { commands: ["typecheck", "test"] });
      result = { status: verify.ok ? "completed" : "failed", artifacts: [{ type: "qa_report", content: JSON.stringify(verify.data) }] };
      break;
    }
    default: {
      const inspect = await gw.call("project.inspect");
      result = { status: "completed", artifacts: [{ type: "report", content: JSON.stringify(inspect.data) }] };
    }
  }

  res.json({ task_id: task.task_id, run_id: runId, ...result as object });
});

app.listen(PORT, HOST, () => {
  console.log(`Harness A2A server http://${HOST}:${PORT}`);
});
