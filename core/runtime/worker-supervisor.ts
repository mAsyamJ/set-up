import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { RegisteredProject } from "../projects/registry.js";
import type { LeaseGrant } from "../tasks/task-service.js";
import { mutationsDisabled } from "./kill-switch.js";
import { assertDiskHeadroom } from "./disk-policy.js";
import { WorktreeManager, type WorktreeRecord } from "./worktree-manager.js";
import { HarnessStore, projectStateDir } from "../state/sqlite.js";
import { TaskService } from "../tasks/task-service.js";

const execFileAsync = promisify(execFile);

export class WorkerSupervisor {
  async runForeground(input: {
    project: RegisteredProject;
    taskId: string;
    workerId: string;
    hermesExecutable: string;
  }): Promise<{ exitCode: number; taskState: string; worktree: string }> {
    if (mutationsDisabled()) throw new Error("Harness mutations are disabled");
    if (input.project.executionPolicy !== "canary-worker") {
      throw new Error("workers are allowed only for disposable canary projects");
    }
    await assertDisposableCanary(input.project);
    assertDiskHeadroom(input.project.canonicalPath);
    const executable = resolveExecutable(input.hermesExecutable);
    const store = new HarnessStore(projectStateDir(input.project.canonicalPath));
    let heartbeat: NodeJS.Timeout | undefined;
    try {
      const tasks = new TaskService(store);
      const worktrees = new WorktreeManager(store);
      const task = tasks.get(input.taskId);
      if (task.projectId !== input.project.id) throw new Error("task project mismatch");
      const lease: LeaseGrant = tasks.claim({
        taskId: task.id,
        workerId: input.workerId,
        ttlMs: 15 * 60_000,
      });
      let record: WorktreeRecord;
      try {
        record = await worktrees.allocate({
          projectRoot: input.project.canonicalPath,
          workspaceId: input.project.id,
          task,
          lease,
        });
      } catch (error) {
        tasks.abandonLease({
          taskId: task.id,
          workerId: input.workerId,
          token: lease.token,
          reason: "worktree allocation failed; any partial worktree was preserved",
        });
        throw error;
      }
      tasks.startRunning(task.id, input.workerId, lease.token);

      const child = spawn(
        executable,
        [
          "chat",
          "--cli",
          "--quiet",
          "--ignore-rules",
          "--source",
          "tool",
          "--toolsets",
          "mcp-harness",
          "--max-turns",
          "24",
          "--query",
          workerPrompt(task.id, task.title, task.objective),
        ],
        {
          cwd: record.canonicalPath,
          stdio: "inherit",
          env: {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            HARNESS_WORKER_ID: input.workerId,
            HARNESS_WORKER_PROJECT_ID: input.project.id,
            HARNESS_WORKER_WORKTREE: record.canonicalPath,
            HARNESS_WORKER_LEASE_TOKEN: lease.token,
          },
        }
      );
      heartbeat = setInterval(() => {
        try {
          assertDiskHeadroom(record.canonicalPath);
          tasks.heartbeat({
            leaseId: lease.id,
            workerId: input.workerId,
            token: lease.token,
            ttlMs: 15 * 60_000,
          });
        } catch {
          child.kill("SIGTERM");
        }
      }, 20_000);
      heartbeat.unref();

      let code: number | null = null;
      try {
        [code] = (await once(child, "exit")) as [number | null];
      } catch {
        code = 1;
      } finally {
        clearInterval(heartbeat);
        heartbeat = undefined;
      }
      let finalTask = tasks.get(task.id);
      if (finalTask.state !== "review") {
        const status = await worktrees.status(record).catch(() => "unknown");
        worktrees.preserve(record, status ? "dirty" : "preserved");
        try {
          finalTask = tasks.abandonLease({
            taskId: task.id,
            workerId: input.workerId,
            token: lease.token,
            reason: `foreground Hermes exited before review (exit=${code ?? 1})`,
          });
        } catch {
          finalTask = tasks.get(task.id);
        }
      }
      return {
        exitCode: code ?? 1,
        taskState: finalTask.state,
        worktree: record.canonicalPath,
      };
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      store.close();
    }
  }
}

function workerPrompt(taskId: string, title: string, objective: string): string {
  return [
    "You are a lease-scoped Agent Harness canary worker.",
    `Task ID: ${taskId}`,
    `Title: ${title}`,
    `Objective: ${objective}`,
    "Use only the mcp-harness tools exposed in this session.",
    "Inspect the assigned worktree, then request exact approval before every write,",
    "verification, commit, and review transition. Stop on denial or any failed tool.",
    "Do not use shell, built-in file tools, networking, delegation, merge, push, or deploy.",
    "The task is complete only when the Harness reports status review.",
  ].join("\n");
}

export async function assertDisposableCanary(project: RegisteredProject): Promise<void> {
  if (
    project.executionPolicy !== "canary-worker" ||
    project.provenance !== "disposable-canary"
  ) {
    throw new Error("worker project lacks disposable-canary policy and provenance");
  }
  const manifestPath = path.join(project.canonicalPath, ".harness", "project.manifest.json");
  const stat = fs.statSync(manifestPath);
  if (!stat.isFile() || stat.size > 256_000) throw new Error("invalid canary manifest");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    schema?: string;
    harness?: { disposableCanary?: boolean };
  };
  if (
    manifest.schema !== "agent-harness.project.v1" ||
    manifest.harness?.disposableCanary !== true
  ) {
    throw new Error("project manifest does not declare a disposable canary");
  }
  const environment = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    GIT_TERMINAL_PROMPT: "0",
  };
  const { stdout: topLevel } = await execFileAsync(
    "git",
    ["-C", project.canonicalPath, "rev-parse", "--show-toplevel"],
    { env: environment, timeout: 10_000, maxBuffer: 64_000 }
  );
  if (fs.realpathSync(topLevel.trim()) !== fs.realpathSync(project.canonicalPath)) {
    throw new Error("registered canary path is not the Git repository root");
  }
  const { stdout: remotes } = await execFileAsync(
    "git",
    ["-C", project.canonicalPath, "remote"],
    { env: environment, timeout: 10_000, maxBuffer: 64_000 }
  );
  if (remotes.trim()) throw new Error("disposable canary must not have Git remotes");
  const { stdout: status } = await execFileAsync(
    "git",
    ["-C", project.canonicalPath, "status", "--porcelain=v1", "--untracked-files=all"],
    { env: environment, timeout: 10_000, maxBuffer: 256_000 }
  );
  if (status.trim()) throw new Error("disposable canary must be clean before leasing");
}

function resolveExecutable(name: string): string {
  if (!/^[a-zA-Z0-9._+-]+$/.test(name)) throw new Error("invalid Hermes executable name");
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    const candidate = path.join(directory, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) return fs.realpathSync(candidate);
    } catch {
      // Continue searching PATH.
    }
  }
  throw new Error(`Hermes worker executable not found: ${name}`);
}
