import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { createActionRecord } from "../../core/actions/action-record.js";
import { ApprovalService } from "../../core/approvals/approval-service.js";
import { checkToolAllowed, getToolPolicy, getToolSpec } from "../../core/policy/tool-policy.js";
import { isSecretPath } from "../../core/policy/path-policy.js";
import { normalizeRepositoryPaths } from "../../core/policy/repository-path-policy.js";
import { safeProjectSummaries } from "../../core/projects/registry.js";
import { SafeFilesystem } from "../../core/runtime/safe-fs.js";
import { mutationsDisabled } from "../../core/runtime/kill-switch.js";
import { assertDiskHeadroom } from "../../core/runtime/disk-policy.js";
import { VerificationRunner } from "../../core/runtime/verification-runner.js";
import { WorktreeManager } from "../../core/runtime/worktree-manager.js";
import { redactText, redactValue, redactedJson } from "../../core/security/redaction.js";
import { HarnessStore, projectStateDir } from "../../core/state/sqlite.js";
import { TaskService } from "../../core/tasks/task-service.js";
import type { GatewayContext, ProjectManifest, ToolResult } from "../../core/types.js";

const execFileAsync = promisify(execFile);
export type { GatewayContext, ProjectManifest, ToolResult };
export { createRunId } from "../../core/types.js";
export { checkToolAllowed } from "../../core/policy/tool-policy.js";

function boundedString(value: unknown, name: string, max: number): string {
  const result = String(value ?? "").trim();
  if (!result || result.length > max) throw new Error(`${name} must contain 1-${max} characters`);
  return result;
}

function stringArray(value: unknown, name: string, maxItems = 32): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > maxItems) {
    throw new Error(`${name} must contain 1-${maxItems} items`);
  }
  return value.map((item) => boundedString(item, name, 500));
}

function repositoryPaths(value: unknown, name: string): string[] {
  try {
    return normalizeRepositoryPaths(stringArray(value, name));
  } catch {
    throw new Error(`${name} contains an unsafe repository path`);
  }
}

function auditShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(auditShape);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        if (["content", "diff", "stdout", "stderr", "output"].includes(key) && typeof item === "string") {
          return [
            key,
            {
              bytes: Buffer.byteLength(item),
              sha256: createHash("sha256").update(item).digest("hex"),
            },
          ];
        }
        return [key, auditShape(item)];
      })
    );
  }
  return value;
}

export function loadManifest(projectRoot: string): ProjectManifest {
  const manifestPath = path.join(projectRoot, ".harness", "project.manifest.json");
  if (!fs.existsSync(manifestPath)) return {};
  const stat = fs.statSync(manifestPath);
  if (!stat.isFile() || stat.size > 256_000) throw new Error("invalid project manifest");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ProjectManifest;
  if (manifest.commands && Object.keys(manifest.commands).length > 0) {
    throw new Error("manifest shell commands are unsupported; use commandIds");
  }
  return manifest;
}

export class ToolGateway {
  private readonly store: HarnessStore;
  private readonly ownsStore: boolean;
  private readonly tasks: TaskService;
  private readonly approvals: ApprovalService;
  private readonly worktrees: WorktreeManager;
  private readonly verification: VerificationRunner;

  constructor(private readonly ctx: GatewayContext, store?: HarnessStore) {
    this.store = store ?? new HarnessStore(projectStateDir(ctx.projectRoot));
    this.ownsStore = !store;
    this.tasks = new TaskService(this.store);
    this.approvals = new ApprovalService(this.store);
    this.worktrees = new WorktreeManager(this.store);
    this.verification = new VerificationRunner(this.store);
  }

  close(): void {
    if (this.ownsStore) this.store.close();
  }

  async call<T = unknown>(
    tool: string,
    args: Record<string, unknown> = {}
  ): Promise<ToolResult<T>> {
    const spec = getToolSpec(tool);
    if (spec && ["R2", "R3", "R4", "R5"].includes(spec.risk) && mutationsDisabled()) {
      const disabled = {
        ok: false,
        tool,
        error: "Harness mutations are disabled by the operator kill switch",
      } as ToolResult<T>;
      this.audit(tool, args, disabled);
      return disabled;
    }
    const gate = checkToolAllowed(tool, args, this.ctx.principal);
    if (!gate.allowed) {
      const denied = { ok: false, tool, error: gate.reason } as ToolResult<T>;
      this.audit(tool, args, denied);
      return denied;
    }
    let result: ToolResult<unknown>;
    try {
      if (spec && ["R3", "R4", "R5"].includes(spec.risk)) {
        assertDiskHeadroom(this.ctx.projectRoot);
      }
      switch (tool) {
        case "harness.health":
          result = this.health();
          break;
        case "project.list":
          result = this.projectList();
          break;
        case "project.inspect":
          result = await this.projectInspect();
          break;
        case "repo.read":
          result = await this.repoRead(args);
          break;
        case "repo.search":
          result = await this.repoSearch(args);
          break;
        case "git.status":
          result = await this.gitCmd(["status", "--short"], "git.status");
          break;
        case "git.diff":
          result = await this.gitCmd(["diff", "--stat", "--"], "git.diff");
          break;
        case "rag.search":
          result = await this.ragSearch(args);
          break;
        case "task.list":
          result = this.taskList();
          break;
        case "task.get":
          result = this.taskGet(args);
          break;
        case "task.submit":
          result = this.taskSubmit(args);
          break;
        case "action.propose":
          result = await this.actionPropose(args);
          break;
        case "workspace.write":
          result = await this.workspaceWrite(args);
          break;
        case "verify.run":
          result = await this.verifyRun(args);
          break;
        case "worktree.commit":
          result = await this.worktreeCommit(args);
          break;
        case "task.review":
          result = this.taskReview(args);
          break;
        default:
          result = { ok: false, tool, error: `not implemented: ${tool}` };
      }
    } catch (error) {
      result = {
        ok: false,
        tool,
        error: redactText(error instanceof Error ? error.message : String(error)),
      };
    }
    const redacted = redactValue(result) as ToolResult<T>;
    this.audit(tool, args, redacted);
    return redacted;
  }

  private health(): ToolResult<Record<string, unknown>> {
    return {
      ok: true,
      tool: "harness.health",
      data: {
        status: "ok",
        schema: "agent-harness.control-plane.v1",
        policyVersion: getToolPolicy().version,
        principalKind: this.ctx.principal.kind,
        profile: this.ctx.principal.profile,
        workspaceId: this.ctx.workspaceId,
        databaseIntegrity: this.store.integrityCheck(),
        fleetEnabled: false,
        automaticApproval: false,
        automaticMergePushDeploy: false,
      },
    };
  }

  private projectList(): ToolResult<{ projects: ReturnType<typeof safeProjectSummaries> }> {
    return { ok: true, tool: "project.list", data: { projects: safeProjectSummaries() } };
  }

  private async projectInspect(): Promise<ToolResult<Record<string, unknown>>> {
    const manifest = loadManifest(this.ctx.projectRoot);
    const { stdout: head } = await execFileAsync(
      "git",
      ["-C", this.ctx.projectRoot, "rev-parse", "HEAD"],
      { timeout: 10_000, maxBuffer: 64_000, env: this.gitEnv() }
    );
    return {
      ok: true,
      tool: "project.inspect",
      data: {
        workspaceId: this.ctx.workspaceId,
        head: head.trim(),
        manifest: redactValue(manifest),
      },
    };
  }

  private async repoRead(
    args: Record<string, unknown>
  ): Promise<ToolResult<{ content: string; path: string }>> {
    const relativePath = boundedString(args.path, "path", 500);
    if (isSecretPath(relativePath)) throw new Error("sensitive path denied");
    const filesystem = new SafeFilesystem(this.ctx.harnessRoot, this.ctx.projectRoot);
    const content = redactText(await filesystem.read(relativePath));
    return { ok: true, tool: "repo.read", data: { path: relativePath, content } };
  }

  private async repoSearch(
    args: Record<string, unknown>
  ): Promise<ToolResult<{ matches: string[] }>> {
    const query = boundedString(args.query, "query", 200);
    if (isSecretPath(query)) throw new Error("sensitive query denied");
    try {
      const { stdout } = await execFileAsync(
        "rg",
        [
          "-F",
          "-l",
          "--max-filesize",
          "1M",
          "--glob",
          "!.git/**",
          "--glob",
          "!.env*",
          "--glob",
          "!.npmrc",
          "--glob",
          "!.netrc",
          "--glob",
          "!*.pem",
          "--glob",
          "!*.key",
          query,
          ".",
        ],
        {
          cwd: this.ctx.projectRoot,
          timeout: 15_000,
          maxBuffer: 256_000,
          env: { PATH: process.env.PATH },
        }
      );
      const matches = stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .filter((candidate) => !isSecretPath(candidate))
        .slice(0, 50);
      return { ok: true, tool: "repo.search", data: { matches } };
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code === 1) return { ok: true, tool: "repo.search", data: { matches: [] } };
      throw error;
    }
  }

  private async gitCmd(
    args: string[],
    tool: string
  ): Promise<ToolResult<{ output: string }>> {
    const { stdout } = await execFileAsync("git", ["-C", this.ctx.projectRoot, ...args], {
      timeout: 15_000,
      maxBuffer: 256_000,
      env: this.gitEnv(),
    });
    return { ok: true, tool, data: { output: redactText(stdout) } };
  }

  private async ragSearch(args: Record<string, unknown>): Promise<ToolResult<unknown>> {
    const query = boundedString(args.query, "query", 500);
    if (isSecretPath(query)) throw new Error("sensitive query denied");
    const { hybridSearch } = await import("../../rag/retrieval/hybrid-search.js");
    const result = await hybridSearch(this.ctx.projectRoot, this.ctx.harnessRoot, query);
    return { ok: true, tool: "rag.search", data: redactValue(result) };
  }

  private taskList(): ToolResult<{ tasks: unknown[] }> {
    return {
      ok: true,
      tool: "task.list",
      data: { tasks: this.tasks.list(this.ctx.workspaceId) },
    };
  }

  private taskGet(args: Record<string, unknown>): ToolResult<{ task: unknown }> {
    const taskId = boundedString(args.taskId, "taskId", 200);
    const task = this.tasks.get(taskId);
    if (task.projectId !== this.ctx.workspaceId) throw new Error("task project mismatch");
    return { ok: true, tool: "task.get", data: { task } };
  }

  private taskSubmit(args: Record<string, unknown>): ToolResult<{ task: unknown }> {
    const title = boundedString(args.title, "title", 200);
    const objective = boundedString(args.objective, "objective", 4_000);
    const idempotencyKey = boundedString(args.idempotencyKey, "idempotencyKey", 128);
    const scope =
      args.scope && typeof args.scope === "object" && !Array.isArray(args.scope)
        ? (args.scope as Record<string, unknown>)
        : {};
    const task = this.tasks.submit({
      projectId: this.ctx.workspaceId,
      workspaceId: this.ctx.workspaceId,
      title,
      objective,
      scope,
      idempotencyKey,
      principal: this.ctx.principal,
    });
    return { ok: true, tool: "task.submit", data: { task } };
  }

  private async actionPropose(
    args: Record<string, unknown>
  ): Promise<ToolResult<Record<string, unknown>>> {
    const taskId = boundedString(args.taskId, "taskId", 200);
    const targetTool = boundedString(args.toolId, "toolId", 100);
    const task = this.tasks.get(taskId);
    if (task.projectId !== this.ctx.workspaceId) throw new Error("task project mismatch");
    const spec = getToolSpec(targetTool);
    if (!spec || spec.approval !== "exact") throw new Error("tool does not support exact approval");
    const targetGate = checkToolAllowed(targetTool, {}, this.ctx.principal);
    if (!targetGate.allowed) throw new Error(targetGate.reason ?? "target tool denied");
    if (this.ctx.principal.kind !== "hermes_worker" || !this.ctx.leaseToken) {
      throw new Error("lease-bound worker principal required");
    }
    const workerId = this.ctx.principal.id.replace(/^worker:/, "");
    const lease = this.tasks.requireActiveLease({
      taskId,
      workerId,
      token: this.ctx.leaseToken,
    });
    const record = this.worktrees.getForLease(taskId, lease.id);
    if (fs.realpathSync(record.canonicalPath) !== fs.realpathSync(this.ctx.projectRoot)) {
      throw new Error("action must be proposed from the assigned worktree");
    }
    let actionArguments =
      args.arguments && typeof args.arguments === "object" && !Array.isArray(args.arguments)
        ? { ...(args.arguments as Record<string, unknown>) }
        : {};
    let commandId: string | null = null;
    switch (targetTool) {
      case "workspace.write": {
        const relativePath = boundedString(actionArguments.path, "path", 500);
        const content = String(actionArguments.content ?? "");
        if (Buffer.byteLength(content) > 1024 * 1024) throw new Error("content exceeds 1 MB");
        repositoryPaths([relativePath], "path");
        actionArguments = {
          path: relativePath,
          content,
          overwrite: actionArguments.overwrite === true,
          allowCreate: actionArguments.allowCreate === true,
        };
        break;
      }
      case "verify.run": {
        const allowedPaths = repositoryPaths(actionArguments.allowedPaths, "allowedPaths");
        commandId = boundedString(actionArguments.commandId, "commandId", 100);
        this.verification.validateCommand(commandId);
        const changeDigest = await this.verification.changeDigest(record, allowedPaths);
        actionArguments = { allowedPaths, changeDigest };
        break;
      }
      case "worktree.commit": {
        const allowedPaths = repositoryPaths(actionArguments.allowedPaths, "allowedPaths");
        const message = boundedString(actionArguments.message, "message", 200);
        const treeDigest = boundedString(actionArguments.treeDigest, "treeDigest", 64);
        if (!/^[0-9a-f]{40,64}$/.test(treeDigest)) throw new Error("invalid tree digest");
        actionArguments = { allowedPaths, message, treeDigest };
        break;
      }
      case "task.review": {
        const commitSha = boundedString(actionArguments.commitSha, "commitSha", 64);
        const treeDigest = boundedString(actionArguments.treeDigest, "treeDigest", 64);
        if (!/^[0-9a-f]{40,64}$/.test(commitSha)) throw new Error("invalid commit SHA");
        if (!/^[0-9a-f]{40,64}$/.test(treeDigest)) throw new Error("invalid tree digest");
        const summary =
          actionArguments.summary &&
          typeof actionArguments.summary === "object" &&
          !Array.isArray(actionArguments.summary)
            ? (actionArguments.summary as Record<string, unknown>)
            : {};
        actionArguments = { commitSha, treeDigest, summary };
        break;
      }
      default:
        throw new Error("unsupported worker action");
    }
    const action = createActionRecord({
      principalId: this.ctx.principal.id,
      taskId,
      projectId: this.ctx.workspaceId,
      workspacePath: record.canonicalPath,
      toolId: targetTool,
      commandId,
      arguments: actionArguments,
      risk: spec.risk,
      policyVersion: getToolPolicy().version,
    });
    const approval = this.approvals.request(action, {
      principalId: action.principalId,
      taskId,
      projectId: action.projectId,
      workspacePath: action.workspacePath,
      toolId: action.toolId,
      commandId: action.commandId,
      risk: action.risk,
      arguments: auditShape(action.arguments),
    });
    return {
      ok: true,
      tool: "action.propose",
      data: {
        approvalId: approval.id,
        actionDigest: approval.digest,
        expiresAt: approval.expiresAt,
        summary: approval.summary,
      },
    };
  }

  private async workspaceWrite(
    args: Record<string, unknown>
  ): Promise<ToolResult<Record<string, unknown>>> {
    const { action, record } = this.consumeWorkerAction("workspace.write", args);
    const relativePath = boundedString(action.arguments.path, "path", 500);
    const content = String(action.arguments.content ?? "");
    const filesystem = new SafeFilesystem(this.ctx.harnessRoot, record.canonicalPath);
    const bytes = await filesystem.write({
      path: relativePath,
      content,
      overwrite: action.arguments.overwrite === true,
      allowCreate: action.arguments.allowCreate === true,
    });
    this.worktrees.preserve(record, "dirty");
    return {
      ok: true,
      tool: "workspace.write",
      data: {
        path: relativePath,
        bytes,
        contentSha256: createHash("sha256").update(content).digest("hex"),
      },
    };
  }

  private async verifyRun(
    args: Record<string, unknown>
  ): Promise<ToolResult<Record<string, unknown>>> {
    const { action, record, lease, taskId, workerId } =
      this.consumeWorkerAction("verify.run", args);
    if (!action.commandId) throw new Error("approved command ID required");
    const allowedPaths = repositoryPaths(action.arguments.allowedPaths, "allowedPaths");
    const changeDigest = boundedString(action.arguments.changeDigest, "changeDigest", 64);
    this.tasks.startVerifying(taskId, workerId, this.ctx.leaseToken!);
    const evidence = await this.verification.run({
      taskId,
      leaseId: lease.id,
      record,
      commandId: action.commandId,
      allowedPaths,
      expectedChangeDigest: changeDigest,
    });
    return {
      ok: evidence.ok,
      tool: "verify.run",
      data: {
        commandId: action.commandId,
        treeDigest: evidence.treeDigest,
        exitCode: evidence.exitCode,
        stdout: evidence.stdout,
        stderr: evidence.stderr,
        timedOut: evidence.timedOut,
        outputLimited: evidence.outputLimited,
      },
    };
  }

  private async worktreeCommit(
    args: Record<string, unknown>
  ): Promise<ToolResult<Record<string, unknown>>> {
    const { action, record } = this.consumeWorkerAction("worktree.commit", args);
    const allowedPaths = repositoryPaths(action.arguments.allowedPaths, "allowedPaths");
    const message = boundedString(action.arguments.message, "message", 200);
    const treeDigest = boundedString(action.arguments.treeDigest, "treeDigest", 64);
    const commitSha = await this.worktrees.commitExact({
      record,
      allowedPaths,
      message,
      expectedTreeDigest: treeDigest,
    });
    return { ok: true, tool: "worktree.commit", data: { commitSha, treeDigest } };
  }

  private taskReview(
    args: Record<string, unknown>
  ): ToolResult<Record<string, unknown>> {
    const { action, taskId, workerId } = this.consumeWorkerAction("task.review", args);
    const commitSha = boundedString(action.arguments.commitSha, "commitSha", 64);
    const treeDigest = boundedString(action.arguments.treeDigest, "treeDigest", 64);
    const summary =
      action.arguments.summary &&
      typeof action.arguments.summary === "object" &&
      !Array.isArray(action.arguments.summary)
        ? (action.arguments.summary as Record<string, unknown>)
        : {};
    const task = this.tasks.moveToReview({
      taskId,
      workerId,
      token: this.ctx.leaseToken!,
      commitSha,
      treeDigest,
      summary,
    });
    return { ok: true, tool: "task.review", data: { task } };
  }

  private consumeWorkerAction(
    expectedTool: string,
    args: Record<string, unknown>
  ) {
    if (this.ctx.principal.kind !== "hermes_worker") throw new Error("worker principal required");
    if (!this.ctx.leaseToken) throw new Error("lease capability required");
    const approvalId = boundedString(args.approvalId, "approvalId", 200);
    const digest = boundedString(args.actionDigest, "actionDigest", 64);
    const taskId = boundedString(args.taskId, "taskId", 200);
    const workerId = this.ctx.principal.id.replace(/^worker:/, "");
    const lease = this.tasks.requireActiveLease({
      taskId,
      workerId,
      token: this.ctx.leaseToken,
    });
    const record = this.worktrees.getForLease(taskId, lease.id);
    if (fs.realpathSync(record.canonicalPath) !== fs.realpathSync(this.ctx.projectRoot)) {
      throw new Error("worker is not confined to the leased worktree");
    }
    const view = this.approvals.get(approvalId);
    if (
      view.digest !== digest ||
      view.principalId !== this.ctx.principal.id ||
      view.toolId !== expectedTool ||
      view.taskId !== taskId ||
      view.projectId !== this.ctx.workspaceId ||
      fs.realpathSync(view.workspacePath) !== fs.realpathSync(record.canonicalPath)
    ) {
      throw new Error("approved action scope mismatch");
    }
    const approval = this.approvals.consume({
      approvalId,
      actionDigest: digest,
      principalId: this.ctx.principal.id,
    });
    return { action: approval, record, lease, taskId, workerId };
  }

  private audit(tool: string, args: Record<string, unknown>, result: ToolResult<unknown>): void {
    this.store.logAudit({
      id: `audit_${randomUUID()}`,
      runId: this.ctx.runId,
      principalId: this.ctx.principal.id,
      eventType: `tool.${result.ok ? "completed" : "denied_or_failed"}`,
      subjectId: tool,
      detailJson: redactedJson({
        tool,
        arguments: auditShape(args),
        result: auditShape(result),
      }),
    });
  }

  private gitEnv(): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      GIT_TERMINAL_PROMPT: "0",
    };
  }
}
