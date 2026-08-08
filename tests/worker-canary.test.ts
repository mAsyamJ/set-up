import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { promisify } from "node:util";
import { ApprovalService } from "../core/approvals/approval-service.js";
import { fixedPrincipal, humanPrincipal, workerPrincipal } from "../core/auth/principal.js";
import { getRegisteredProject } from "../core/projects/registry.js";
import { WorktreeManager } from "../core/runtime/worktree-manager.js";
import { HarnessStore, projectStateDir } from "../core/state/sqlite.js";
import { TaskService } from "../core/tasks/task-service.js";
import { createRunId } from "../core/types.js";
import { ToolGateway } from "../tools/gateway/tool-gateway.js";

const execFileAsync = promisify(execFile);

async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", root, ...args], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, GIT_TERMINAL_PROMPT: "0" },
  });
  return stdout.trim();
}

describe("single-worker disposable canary", () => {
  it("ends in review with a preserved verified commit and no remote", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-canary-"));
    const project = path.join(root, "project");
    const state = path.join(root, "state");
    const registryPath = path.join(root, "projects.json");
    fs.mkdirSync(project);
    await execFileAsync("git", ["init", "-b", "main", project]);
    fs.writeFileSync(
      path.join(project, "package.json"),
      `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`
    );
    fs.writeFileSync(path.join(project, "message.txt"), "before\n");
    fs.mkdirSync(path.join(project, ".harness"));
    fs.writeFileSync(
      path.join(project, ".harness", "project.manifest.json"),
      `${JSON.stringify({
        schema: "agent-harness.project.v1",
        harness: { disposableCanary: true },
      }, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(project, "message.test.js"),
      [
        'import assert from "node:assert/strict";',
        'import fs from "node:fs";',
        'import test from "node:test";',
        'test("approved message", () => {',
        '  assert.equal(fs.readFileSync("message.txt", "utf8"), "after\\n");',
        "});",
        "",
      ].join("\n")
    );
    await git(project, [
      "add",
      "--",
      ".harness/project.manifest.json",
      "package.json",
      "message.txt",
      "message.test.js",
    ]);
    await git(project, [
      "-c",
      "user.name=Canary",
      "-c",
      "user.email=canary@localhost",
      "commit",
      "-m",
      "initial canary",
    ]);
    const projectId = "00000000-0000-4000-8000-000000000042";
    fs.writeFileSync(
      registryPath,
      JSON.stringify({
        schema: "agent-harness.projects.v2",
        pathBase: "registry",
        projects: {
          canary: {
            id: projectId,
            path: project,
            displayName: "Disposable Canary",
            provenance: "disposable-canary",
            executionPolicy: "canary-worker",
          },
        },
      })
    );
    const registered = getRegisteredProject("canary", registryPath);
    assert.equal(registered.executionPolicy, "canary-worker");
    assert.equal(await git(project, ["remote"]), "");

    const previousState = process.env.HARNESS_STATE_HOME;
    process.env.HARNESS_STATE_HOME = state;
    const store = new HarnessStore(projectStateDir(project));
    try {
      const tasks = new TaskService(store);
      const approvals = new ApprovalService(store);
      const worktrees = new WorktreeManager(store);
      const operator = humanPrincipal("canary-operator");
      const task = tasks.submit({
        projectId,
        workspaceId: projectId,
        title: "Change canary message",
        objective: "Replace message.txt with the approved deterministic value",
        scope: { paths: ["message.txt"] },
        idempotencyKey: "canary-e2e-1",
        principal: fixedPrincipal("hermes-operator"),
      });
      tasks.queue(task.id, operator);
      const lease = tasks.claim({ taskId: task.id, workerId: "canary-worker", ttlMs: 15 * 60_000 });
      const record = await worktrees.allocate({
        projectRoot: project,
        workspaceId: projectId,
        task,
        lease,
      });
      tasks.startRunning(task.id, lease.workerId, lease.token);
      const worker = workerPrincipal(lease.workerId);
      const gateway = new ToolGateway(
        {
          projectRoot: record.canonicalPath,
          harnessRoot: process.cwd(),
          runId: createRunId(),
          workspaceId: projectId,
          principal: worker,
          leaseToken: lease.token,
        },
        store
      );

      const proposeAndApprove = async (
        toolId: "workspace.write" | "verify.run" | "worktree.commit" | "task.review",
        actionArguments: Record<string, unknown>
      ) => {
        const proposed = await gateway.call<{
          approvalId: string;
          actionDigest: string;
          expiresAt: string;
        }>("action.propose", {
          taskId: task.id,
          toolId,
          arguments: actionArguments,
        });
        assert.equal(proposed.ok, true, proposed.error);
        const data = proposed.data!;
        approvals.decide(data.approvalId, operator, "approved");
        return {
          taskId: task.id,
          approvalId: data.approvalId,
          actionDigest: data.actionDigest,
        };
      };

      const writeApproval = await proposeAndApprove("workspace.write", {
        path: "message.txt",
        content: "after\n",
        overwrite: true,
      });
      const writeResult = await gateway.call("workspace.write", writeApproval);
      assert.equal(writeResult.ok, true, writeResult.error);

      const verifyApproval = await proposeAndApprove("verify.run", {
        allowedPaths: ["message.txt"],
        commandId: "canary.test",
      });
      const verifyResult = await gateway.call<{
        treeDigest: string;
        exitCode: number;
      }>("verify.run", verifyApproval);
      assert.equal(verifyResult.ok, true, JSON.stringify(verifyResult));
      assert.equal(verifyResult.data?.exitCode, 0);
      const treeDigest = verifyResult.data!.treeDigest;

      const commitApproval = await proposeAndApprove("worktree.commit", {
        allowedPaths: ["message.txt"],
        message: "canary: apply approved message",
        treeDigest,
      });
      const commitResult = await gateway.call<{ commitSha: string }>(
        "worktree.commit",
        commitApproval
      );
      assert.equal(commitResult.ok, true, commitResult.error);
      const commitSha = commitResult.data!.commitSha;
      assert.match(commitSha, /^[0-9a-f]{40,64}$/);

      const reviewApproval = await proposeAndApprove("task.review", {
        commitSha,
        treeDigest,
        summary: { result: "approved canary completed", verification: "canary.test" },
      });
      const reviewResult = await gateway.call("task.review", reviewApproval);
      assert.equal(reviewResult.ok, true, reviewResult.error);
      assert.equal(tasks.get(task.id).state, "review");
      assert.equal(tasks.get(task.id).reviewCommitSha, commitSha);
      assert.equal(await git(record.canonicalPath, ["status", "--porcelain"]), "");
      assert.equal(await git(project, ["remote"]), "");
      gateway.close();
    } finally {
      store.close();
      if (previousState === undefined) delete process.env.HARNESS_STATE_HOME;
      else process.env.HARNESS_STATE_HOME = previousState;
    }
  });
});
