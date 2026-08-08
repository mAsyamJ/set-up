import { spawn } from "node:child_process";
import path from "node:path";
import { isSecretPath } from "../policy/path-policy.js";

type BrokerResponse = {
  ok: boolean;
  error?: string;
  content?: string;
  bytes?: number;
};

export class SafeFilesystem {
  private readonly brokerPath: string;

  constructor(
    private readonly harnessRoot: string,
    private readonly worktreeRoot: string
  ) {
    this.brokerPath = path.join(harnessRoot, "tools", "fs-broker", "safe_fs.py");
  }

  read(relativePath: string): Promise<string> {
    this.validatePath(relativePath);
    return this.call({ operation: "read", path: relativePath })
      .then((result) => result.content ?? "");
  }

  async write(input: {
    path: string;
    content: string;
    overwrite?: boolean;
    allowCreate?: boolean;
  }): Promise<number> {
    this.validatePath(input.path);
    const result = await this.call({
      operation: "write",
      path: input.path,
      content: input.content,
      overwrite: input.overwrite === true,
      allowCreate: input.allowCreate === true,
    });
    return result.bytes ?? 0;
  }

  private validatePath(relativePath: string): void {
    if (!relativePath || path.isAbsolute(relativePath) || isSecretPath(relativePath)) {
      throw new Error("invalid or sensitive workspace path");
    }
  }

  private call(request: Record<string, unknown>): Promise<BrokerResponse> {
    return new Promise((resolve, reject) => {
      const child = spawn("python3", [this.brokerPath, this.worktreeRoot], {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          PATH: process.env.PATH,
          PYTHONIOENCODING: "utf-8",
        },
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let size = 0;
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
      }, 10_000);

      child.stdout.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 1_100_000) child.kill("SIGKILL");
        else stdout.push(chunk);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        if (Buffer.concat(stderr).length < 16_384) stderr.push(chunk);
      });
      child.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timer);
        try {
          const result = JSON.parse(Buffer.concat(stdout).toString("utf8")) as BrokerResponse;
          if (code !== 0 || !result.ok) {
            reject(new Error(result.error ?? "filesystem broker failed"));
          } else {
            resolve(result);
          }
        } catch {
          reject(
            new Error(
              `filesystem broker protocol failure: ${Buffer.concat(stderr).toString("utf8").slice(0, 1024)}`
            )
          );
        }
      });
      child.stdin.end(JSON.stringify(request));
    });
  }
}
