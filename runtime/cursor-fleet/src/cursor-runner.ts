import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { CursorMode } from "./profile-modes.js";

const execFileAsync = promisify(execFile);

export type CursorRunOptions = {
  prompt: string;
  cwd: string;
  mode: CursorMode;
  harnessRoot: string;
  modelId?: string;
  timeoutMs?: number;
};

export type CursorRunResult = {
  ok: boolean;
  text: string;
  error?: string;
};

function sdkPath(harnessRoot: string): string {
  const bridgeModules = path.join(harnessRoot, "tools/kiro-openai-bridge/node_modules/@cursor/sdk");
  return pathToFileURL(path.join(bridgeModules, "dist/esm/index.js")).href;
}

function extractRunText(result: { result?: string; summary?: string }): string {
  return (
    (typeof result?.result === "string" && result.result.trim()) ||
    (typeof result?.summary === "string" && result.summary.trim()) ||
    ""
  );
}

async function isAgentLoggedIn(agentBin: string, cwd: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(agentBin, ["status"], {
      cwd,
      timeout: 15000,
      env: process.env,
    });
    return !/not logged in/i.test(String(stdout));
  } catch {
    return false;
  }
}

async function callAgentCli(opts: CursorRunOptions): Promise<string> {
  const modelId = opts.modelId ?? process.env.CURSOR_MODEL ?? "composer-2";
  const agentBin = process.env.CURSOR_AGENT_BIN ?? "agent";
  const useForce =
    opts.mode === "agent" &&
    !/^(0|false|no)$/i.test(String(process.env.CURSOR_AGENT_FORCE ?? "1"));

  const args = [
    "--print",
    "--trust",
    "--output-format",
    "text",
    "--model",
    modelId,
    "--workspace",
    opts.cwd,
  ];
  if (opts.mode === "ask" || opts.mode === "plan") {
    args.push("--mode", opts.mode);
  } else if (useForce) {
    args.push("--force");
  }

  return new Promise((resolve, reject) => {
    const child = spawn(agentBin, args, {
      cwd: opts.cwd,
      env: {
        ...process.env,
        AEGIS_WORKSPACE: opts.cwd,
        AEGIS_REPO_PATH: opts.cwd,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
      },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      stdout += c;
    });
    child.stderr.on("data", (c) => {
      stderr += c;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const out = stdout.trim();
      const err = stderr.trim();
      if (code !== 0) {
        reject(new Error(err || `agent CLI exited with code ${code}`));
        return;
      }
      if (!out) {
        reject(new Error(err || "agent CLI returned no output"));
        return;
      }
      resolve(out);
    });
    child.stdin.write(opts.prompt);
    child.stdin.end();
  });
}

async function callSdk(apiKey: string, opts: CursorRunOptions): Promise<string> {
  const sdk = await import(sdkPath(opts.harnessRoot));
  const { Agent, CursorAgentError } = sdk as {
    Agent: {
      create: (o: Record<string, unknown>) => Promise<{
        send: (p: string, o?: { mode?: string }) => Promise<{ wait: () => Promise<{ status: string; id?: string; result?: string; summary?: string }> }>;
        dispose?: () => Promise<void>;
      }>;
      prompt: (p: string, o: Record<string, unknown>) => Promise<{ status: string; id?: string; result?: string; summary?: string }>;
    };
    CursorAgentError?: new (m: string) => Error;
  };

  const modelId = opts.modelId ?? process.env.CURSOR_MODEL ?? "composer-2";
  const localOptions = {
    cwd: opts.cwd,
    settingSources: opts.mode === "agent" ? ["project"] : [],
  };
  const baseOptions = {
    apiKey,
    model: { id: modelId },
    local: localOptions,
  };

  try {
    if (opts.mode === "agent" || opts.mode === "plan") {
      const agent = await Agent.create({ ...baseOptions, mode: opts.mode });
      try {
        const run = await agent.send(opts.prompt, { mode: opts.mode });
        const result = await run.wait();
        if (result.status === "error") {
          throw new Error(`Cursor run failed (status=error, id=${result.id ?? "unknown"})`);
        }
        const text = extractRunText(result);
        if (!text) throw new Error("Cursor SDK returned no visible text output.");
        return text;
      } finally {
        if (typeof agent.dispose === "function") {
          await agent.dispose().catch(() => {});
        }
      }
    }

    const result = await Agent.prompt(opts.prompt, { ...baseOptions, mode: "ask" });
    if (result.status === "error") {
      throw new Error(`Cursor run failed (status=error, id=${result.id ?? "unknown"})`);
    }
    const text = extractRunText(result);
    if (!text) throw new Error("Cursor SDK returned no visible text output.");
    return text;
  } catch (err) {
    if (CursorAgentError && err instanceof CursorAgentError) {
      throw new Error(`Cursor startup failed: ${err.message}`);
    }
    throw err;
  }
}

export async function runCursorAgent(opts: CursorRunOptions): Promise<CursorRunResult> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  try {
    let text: string;
    if (apiKey) {
      text = await callSdk(apiKey, opts);
    } else if (await isAgentLoggedIn(process.env.CURSOR_AGENT_BIN ?? "agent", opts.cwd)) {
      text = await callAgentCli(opts);
    } else {
      return {
        ok: false,
        text: "",
        error: "Cursor not configured: set CURSOR_API_KEY or run agent login",
      };
    }
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      text: "",
      error: String((err as Error)?.message ?? err),
    };
  }
}
