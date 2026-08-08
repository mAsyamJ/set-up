import { createHash, randomUUID } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";
import { normalizeRepositoryPaths } from "../policy/repository-path-policy.js";
import { redactText } from "../security/redaction.js";
import type { HarnessStore } from "../state/sqlite.js";
import type { WorktreeRecord } from "./worktree-manager.js";
import commandCatalog from "../../tools/policies/command-catalog.json" with { type: "json" };

const execFileAsync = promisify(execFile);

type CommandSpec = {
  file: string;
  args: string[];
  cwdPolicy: "worktree";
  timeoutMs: number;
  outputLimitBytes: number;
  network: "deny";
};

type CommandResult = {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  outputLimited: boolean;
};

export type VerificationEvidence = CommandResult & { treeDigest: string };

async function git(worktree: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", worktree, ...args], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, GIT_TERMINAL_PROMPT: "0" },
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
    encoding: "utf8",
  });
  return stdout;
}

function nulPaths(value: string): string[] {
  return value.split("\0").filter(Boolean).sort();
}

async function resolveExecutable(file: string): Promise<string> {
  if (!/^[a-zA-Z0-9._+-]+$/.test(file)) throw new Error("invalid command executable");
  for (const directory of (process.env.PATH ?? "").split(pathDelimiter())) {
    if (!directory) continue;
    const candidate = `${directory}/${file}`;
    if (pathIsExecutable(candidate)) return fs.realpathSync(candidate);
  }
  throw new Error(`trusted executable unavailable: ${file}`);
}

function pathDelimiter(): string {
  return process.platform === "win32" ? ";" : ":";
}

function pathIsExecutable(candidate: string): boolean {
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function runSandboxed(
  worktree: string,
  executable: string,
  args: string[],
  spec: CommandSpec
): Promise<CommandResult> {
  if (!fs.existsSync("/usr/bin/bwrap")) {
    throw new Error("bubblewrap is required for network-denied verification");
  }
  return new Promise((resolve, reject) => {
    const sandboxWorktree = "/tmp/worktree";
    const bwrapArgs = [
      "--die-with-parent",
      "--new-session",
      "--unshare-net",
      "--ro-bind",
      "/",
      "/",
      "--tmpfs",
      "/tmp",
      "--dir",
      sandboxWorktree,
      "--bind",
      worktree,
      sandboxWorktree,
      "--chdir",
      sandboxWorktree,
      "--setenv",
      "HOME",
      "/tmp",
      "--setenv",
      "CI",
      "1",
      "--setenv",
      "NO_COLOR",
      "1",
      "--",
      executable,
      ...args,
    ];
    const child = spawn("/usr/bin/bwrap", bwrapArgs, {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { PATH: process.env.PATH },
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let outputLimited = false;

    const terminate = () => {
      if (child.pid) {
        try {
          process.kill(-child.pid, "SIGTERM");
          setTimeout(() => {
            try {
              process.kill(-child.pid!, "SIGKILL");
            } catch {
              // Process already exited.
            }
          }, 2_000).unref();
        } catch {
          child.kill("SIGKILL");
        }
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, spec.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      const remaining = spec.outputLimitBytes - stdoutBytes;
      if (remaining > 0) stdout.push(chunk.subarray(0, remaining));
      stdoutBytes += chunk.length;
      if (stdoutBytes > spec.outputLimitBytes) {
        outputLimited = true;
        terminate();
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const remaining = spec.outputLimitBytes - stderrBytes;
      if (remaining > 0) stderr.push(chunk.subarray(0, remaining));
      stderrBytes += chunk.length;
      if (stderrBytes > spec.outputLimitBytes) {
        outputLimited = true;
        terminate();
      }
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut && !outputLimited,
        exitCode: code ?? (signal ? 128 : 1),
        stdout: redactText(Buffer.concat(stdout).toString("utf8")),
        stderr: redactText(Buffer.concat(stderr).toString("utf8")),
        timedOut,
        outputLimited,
      });
    });
  });
}

export class VerificationRunner {
  constructor(private readonly store: HarnessStore) {}

  validateCommand(commandId: string): void {
    commandSpec(commandId);
  }

  async changeDigest(record: WorktreeRecord, allowedPaths: string[]): Promise<string> {
    const expected = normalizeRepositoryPaths(allowedPaths);
    for (const candidate of expected) {
      await git(record.canonicalPath, ["ls-files", "--error-unmatch", "--", candidate]);
    }
    const changed = nulPaths(
      await git(record.canonicalPath, ["diff", "--name-only", "-z", "HEAD", "--"])
    );
    const untracked = nulPaths(
      await git(record.canonicalPath, ["ls-files", "--others", "--exclude-standard", "-z"])
    );
    if (untracked.length > 0) throw new Error("untracked changes are unsupported in the initial worker profile");
    if (changed.length === 0) throw new Error("change task has no relevant diff");
    if (changed.some((candidate) => !expected.includes(candidate))) {
      throw new Error("worktree contains changes outside approved paths");
    }
    const diff = await git(record.canonicalPath, [
      "diff",
      "--binary",
      "--no-ext-diff",
      "HEAD",
      "--",
      ...expected,
    ]);
    return createHash("sha256").update(diff).digest("hex");
  }

  async prepareTree(record: WorktreeRecord, allowedPaths: string[]): Promise<string> {
    const expected = normalizeRepositoryPaths(allowedPaths);
    await git(record.canonicalPath, ["add", "--", ...expected]);
    await this.assertExactChanges(record, expected);
    return (await git(record.canonicalPath, ["write-tree"])).trim();
  }

  async run(input: {
    taskId: string;
    leaseId: string;
    record: WorktreeRecord;
    commandId: string;
    allowedPaths: string[];
    expectedChangeDigest: string;
  }): Promise<VerificationEvidence> {
    const spec = commandSpec(input.commandId);
    const currentChangeDigest = await this.changeDigest(input.record, input.allowedPaths);
    if (currentChangeDigest !== input.expectedChangeDigest) {
      throw new Error("worktree changed after approval");
    }
    const before = await this.prepareTree(input.record, input.allowedPaths);
    const executable = await resolveExecutable(spec.file);
    const startedAt = new Date().toISOString();
    const result = await runSandboxed(
      input.record.canonicalPath,
      executable,
      spec.args,
      spec
    );
    const endedAt = new Date().toISOString();
    await this.assertExactChanges(input.record, input.allowedPaths);
    const after = (await git(input.record.canonicalPath, ["write-tree"])).trim();
    if (after !== before) throw new Error("verification command modified the approved tree");
    this.store.database().prepare(`
      INSERT INTO verification_runs(
        id, task_id, lease_id, command_id, tree_digest, exit_code,
        stdout_redacted, stderr_redacted, started_at, ended_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `verify_${randomUUID()}`,
      input.taskId,
      input.leaseId,
      input.commandId,
      before,
      result.exitCode,
      result.stdout,
      result.stderr,
      startedAt,
      endedAt
    );
    return { ...result, treeDigest: before };
  }

  private async assertExactChanges(
    record: WorktreeRecord,
    allowedPaths: string[]
  ): Promise<void> {
    const expected = normalizeRepositoryPaths(allowedPaths);
    const staged = nulPaths(
      await git(record.canonicalPath, ["diff", "--cached", "--name-only", "-z", "--"])
    );
    const unstaged = nulPaths(
      await git(record.canonicalPath, ["diff", "--name-only", "-z", "--"])
    );
    const untracked = nulPaths(
      await git(record.canonicalPath, ["ls-files", "--others", "--exclude-standard", "-z"])
    );
    if (JSON.stringify(staged) !== JSON.stringify(expected)) {
      throw new Error("staged paths do not exactly match approved paths");
    }
    if (unstaged.length > 0 || untracked.length > 0) {
      throw new Error("worktree contains unapproved unstaged or untracked changes");
    }
  }
}

function commandSpec(commandId: string): CommandSpec {
  const spec = (commandCatalog as Record<string, CommandSpec>)[commandId];
  if (!spec) throw new Error(`unknown trusted command ID: ${commandId}`);
  if (
    spec.cwdPolicy !== "worktree" ||
    spec.network !== "deny" ||
    spec.timeoutMs < 1 ||
    spec.timeoutMs > 10 * 60_000 ||
    spec.outputLimitBytes < 1 ||
    spec.outputLimitBytes > 1024 * 1024
  ) {
    throw new Error(`invalid trusted command specification: ${commandId}`);
  }
  if (!Array.isArray(spec.args) || spec.args.some((argument) => typeof argument !== "string")) {
    throw new Error(`invalid trusted command arguments: ${commandId}`);
  }
  return spec;
}
