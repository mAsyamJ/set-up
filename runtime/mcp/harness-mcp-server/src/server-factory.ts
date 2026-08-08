import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Principal } from "../../../../core/auth/principal.js";
import { getRegisteredProject } from "../../../../core/projects/registry.js";
import { redactText } from "../../../../core/security/redaction.js";
import { HarnessStore, harnessStateHome, projectStateDir } from "../../../../core/state/sqlite.js";
import { createRunId } from "../../../../core/types.js";
import { ToolGateway } from "../../../../tools/gateway/tool-gateway.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_ROOT = path.resolve(__dirname, "../../../..");

type McpMode = "audit" | "cursor" | "hermes-operator" | "worker";

type StartOptions = {
  mode: McpMode;
  principal: Principal;
  leaseToken?: string;
  workerProjectId?: string;
  workerWorktree?: string;
};

type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
};

function response<T extends { ok: boolean }>(result: T): ToolResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError: !result.ok,
  };
}

function errorResponse(error: unknown): ToolResponse {
  const message = error instanceof Error ? error.message : String(error);
  return response({
    ok: false,
    error: redactText(message).slice(0, 2_048),
  });
}

export async function startHarnessMcp(options: StartOptions): Promise<void> {
  const server = new McpServer({
    name: `harness-mcp-${options.mode}`,
    version: "1.0.0",
  });

  async function call(
    tool: string,
    args: Record<string, unknown>,
    explicitProjectId?: string
  ): Promise<ToolResponse> {
    let store: HarnessStore | undefined;
    let gateway: ToolGateway | undefined;
    try {
      const configuredProject =
        explicitProjectId ??
        options.workerProjectId ??
        process.env.HARNESS_PROJECT_ID;
      if (!configuredProject && !["harness.health", "project.list"].includes(tool)) {
        throw new Error("an explicit registered project is required");
      }
      if (configuredProject) {
        const project = getRegisteredProject(configuredProject);
        const projectRoot =
          options.mode === "worker"
            ? path.resolve(options.workerWorktree ?? "")
            : project.canonicalPath;
        if (options.mode === "worker" && !options.workerWorktree) {
          throw new Error("worker worktree is required");
        }
        store = new HarnessStore(projectStateDir(project.canonicalPath));
        gateway = new ToolGateway(
          {
            projectRoot,
            harnessRoot: HARNESS_ROOT,
            runId: createRunId(),
            workspaceId: project.id,
            principal: options.principal,
            leaseToken: options.leaseToken,
          },
          store
        );
      } else {
        store = new HarnessStore(path.join(harnessStateHome(), "control"));
        gateway = new ToolGateway(
          {
            projectRoot: HARNESS_ROOT,
            harnessRoot: HARNESS_ROOT,
            runId: createRunId(),
            workspaceId: "harness-control-plane",
            principal: options.principal,
          },
          store
        );
      }
      return response(await gateway.call(tool, args));
    } catch (error) {
      return errorResponse(error);
    } finally {
      gateway?.close();
      store?.close();
    }
  }

  server.tool("harness_health", "Report redacted Harness health and safety state.", {}, async () =>
    call("harness.health", {})
  );
  server.tool("harness_list_projects", "List safe registered project metadata.", {}, async () =>
    call("project.list", {})
  );

  if (options.mode === "cursor" || options.mode === "audit") {
    server.tool("harness_project_inspect", "Inspect safe project metadata.", {}, async () =>
      call("project.inspect", {})
    );
    server.tool(
      "harness_repo_read",
      "Read one non-sensitive project file up to 1 MB.",
      { path: z.string().min(1).max(500) },
      async ({ path: relativePath }) => call("repo.read", { path: relativePath })
    );
    server.tool(
      "harness_repo_search",
      "Find files containing a fixed string.",
      { query: z.string().min(1).max(200) },
      async ({ query }) => call("repo.search", { query })
    );
    server.tool("harness_git_status", "Read concise Git status.", {}, async () =>
      call("git.status", {})
    );
    server.tool("harness_git_diff", "Read Git diff statistics.", {}, async () =>
      call("git.diff", {})
    );
  }

  if (options.mode === "cursor") {
    server.tool(
      "harness_rag_search",
      "Run bounded project retrieval.",
      { query: z.string().min(1).max(500) },
      async ({ query }) => call("rag.search", { query })
    );
    server.tool("harness_task_list", "List tasks for the configured project.", {}, async () =>
      call("task.list", {})
    );
    server.tool(
      "harness_task_get",
      "Read one redacted task.",
      { taskId: z.string().min(1).max(200) },
      async ({ taskId }) => call("task.get", { taskId })
    );
    server.tool(
      "harness_task_submit",
      "Submit a bounded task proposal; this does not queue or execute it.",
      {
        title: z.string().min(1).max(200),
        objective: z.string().min(1).max(4_000),
        idempotencyKey: z.string().min(1).max(128),
        scope: z.record(z.unknown()).optional(),
      },
      async ({ title, objective, idempotencyKey, scope }) =>
        call("task.submit", { title, objective, idempotencyKey, scope: scope ?? {} })
    );
  }

  if (options.mode === "hermes-operator") {
    const projectSchema = z.string().min(1).max(64);
    server.tool(
      "harness_project_inspect",
      "Inspect safe metadata for an explicit registered project.",
      { projectId: projectSchema },
      async ({ projectId }) => call("project.inspect", {}, projectId)
    );
    server.tool(
      "harness_rag_search",
      "Run bounded retrieval for an explicit registered project.",
      { projectId: projectSchema, query: z.string().min(1).max(500) },
      async ({ projectId, query }) => call("rag.search", { query }, projectId)
    );
    server.tool(
      "harness_task_list",
      "List redacted tasks for an explicit registered project.",
      { projectId: projectSchema },
      async ({ projectId }) => call("task.list", {}, projectId)
    );
    server.tool(
      "harness_task_get",
      "Read one redacted task.",
      { projectId: projectSchema, taskId: z.string().min(1).max(200) },
      async ({ projectId, taskId }) => call("task.get", { taskId }, projectId)
    );
    if (process.env.HARNESS_HERMES_TASK_SUBMISSION === "1") {
      server.tool(
        "harness_task_submit",
        "Submit a bounded task proposal; this does not approve, queue, or execute it.",
        {
          projectId: projectSchema,
          title: z.string().min(1).max(200),
          objective: z.string().min(1).max(4_000),
          idempotencyKey: z.string().min(1).max(128),
          scope: z.record(z.unknown()).optional(),
        },
        async ({ projectId, title, objective, idempotencyKey, scope }) =>
          call(
            "task.submit",
            { title, objective, idempotencyKey, scope: scope ?? {} },
            projectId
          )
      );
    }
  }

  if (options.mode === "worker") {
    const executionSchema = {
      taskId: z.string().min(1).max(200),
      approvalId: z.string().min(1).max(200),
      actionDigest: z.string().regex(/^[0-9a-f]{64}$/),
    };
    server.tool("harness_project_inspect", "Inspect assigned worktree metadata.", {}, async () =>
      call("project.inspect", {})
    );
    server.tool(
      "harness_repo_read",
      "Read one assigned-worktree file.",
      { path: z.string().min(1).max(500) },
      async ({ path: relativePath }) => call("repo.read", { path: relativePath })
    );
    server.tool(
      "harness_repo_search",
      "Search assigned-worktree files.",
      { query: z.string().min(1).max(200) },
      async ({ query }) => call("repo.search", { query })
    );
    server.tool(
      "harness_action_propose",
      "Request human approval for one exact worker action.",
      {
        taskId: z.string().min(1).max(200),
        toolId: z.enum(["workspace.write", "verify.run", "worktree.commit", "task.review"]),
        arguments: z.record(z.unknown()),
      },
      async ({ taskId, toolId, arguments: actionArguments }) =>
        call("action.propose", { taskId, toolId, arguments: actionArguments })
    );
    server.tool(
      "harness_workspace_write",
      "Consume an exact approval and perform its stored file replacement.",
      executionSchema,
      async (args) => call("workspace.write", args)
    );
    server.tool(
      "harness_verify_run",
      "Consume an exact approval and run its trusted command.",
      executionSchema,
      async (args) => call("verify.run", args)
    );
    server.tool(
      "harness_worktree_commit",
      "Consume an exact approval and preserve the verified tree as a commit.",
      executionSchema,
      async (args) => call("worktree.commit", args)
    );
    server.tool(
      "harness_task_review",
      "Consume an exact approval and move verified committed work to review.",
      executionSchema,
      async (args) => call("task.review", args)
    );
  }

  await server.connect(new StdioServerTransport());
}
