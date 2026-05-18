import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const WORKSPACE =
  process.env.AEGIS_WORKSPACE || "/home/asyam/dev/Project/aegis-hackathon-kit";

export const HERMES_BIN =
  process.env.HERMES_BIN || "/home/asyam/.local/bin/hermes";

export const KIRO_BRIDGE_URL =
  process.env.KIRO_BRIDGE_URL || "http://127.0.0.1:8787";

export type RunCommandResult = {
  text: string;
  isError: boolean;
};

export async function runCommand(
  cmd: string,
  args: string[],
  timeoutMs = 30000
): Promise<RunCommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd: WORKSPACE,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 8,
      env: process.env
    });

    const text =
      [
        stdout ? `STDOUT:\n${stdout}` : "",
        stderr ? `STDERR:\n${stderr}` : ""
      ]
        .filter(Boolean)
        .join("\n\n") || "Command completed with no output.";

    return { text, isError: false };
  } catch (err: unknown) {
    const e = err as {
      message?: string;
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    const text = [
      `ERROR: ${e?.message || String(err)}`,
      e?.stdout ? `STDOUT:\n${e.stdout}` : "",
      e?.stderr ? `STDERR:\n${e.stderr}` : ""
    ]
      .filter(Boolean)
      .join("\n\n");

    return { text, isError: true };
  }
}

export function mcpText(result: RunCommandResult) {
  return {
    content: [{ type: "text" as const, text: result.text }],
    isError: result.isError
  };
}
