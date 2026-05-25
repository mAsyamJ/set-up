#!/usr/bin/env node
/**
 * Hermes bridge provider: Cursor via local agent CLI or @cursor/sdk.
 * Prefers CURSOR_API_KEY + SDK; falls back to `agent login` session.
 * CURSOR_BRIDGE_MODE: agent (default) | ask | plan
 * Prompt is read from argv[2] or stdin (bridge uses stdin for large payloads).
 */
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const WORKSPACE =
  process.env.AEGIS_WORKSPACE ||
  process.env.AEGIS_REPO_PATH ||
  path.resolve(import.meta.dirname, "../..");

const VALID_BRIDGE_MODES = new Set(["agent", "ask", "plan"]);

function getBridgeMode() {
  const raw = String(process.env.CURSOR_BRIDGE_MODE || "agent").trim().toLowerCase();
  return VALID_BRIDGE_MODES.has(raw) ? raw : "agent";
}

async function readPrompt() {
  const arg = process.argv[2];
  if (arg) return arg;
  if (process.stdin.isTTY) {
    console.error("ERROR: missing prompt");
    process.exit(1);
  }
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) {
    console.error("ERROR: missing prompt");
    process.exit(1);
  }
  return text;
}

const modelId = process.env.CURSOR_MODEL || "composer-2";
const agentBin = process.env.CURSOR_AGENT_BIN || "agent";
const bridgeMode = getBridgeMode();
const useForce =
  bridgeMode === "agent" &&
  !/^(0|false|no)$/i.test(String(process.env.CURSOR_AGENT_FORCE ?? "1"));

async function isAgentLoggedIn() {
  try {
    const { stdout } = await execFileAsync(agentBin, ["status"], {
      cwd: WORKSPACE,
      timeout: 15000,
      env: process.env,
    });
    return !/not logged in/i.test(String(stdout));
  } catch {
    return false;
  }
}

function buildAgentCliArgs() {
  const args = [
    "--print",
    "--trust",
    "--output-format",
    "text",
    "--model",
    modelId,
    "--workspace",
    WORKSPACE,
  ];

  if (bridgeMode === "ask" || bridgeMode === "plan") {
    args.push("--mode", bridgeMode);
  } else if (useForce) {
    args.push("--force");
  }

  return args;
}

async function callAgentCli(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(agentBin, buildAgentCliArgs(), {
      cwd: WORKSPACE,
      env: {
        ...process.env,
        AEGIS_WORKSPACE: WORKSPACE,
        AEGIS_REPO_PATH: WORKSPACE,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
      },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
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

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function loadSdk() {
  const bridgeNodeModules = path.join(
    WORKSPACE,
    "tools/kiro-openai-bridge/node_modules/@cursor/sdk"
  );
  return import(pathToFileURL(path.join(bridgeNodeModules, "dist/esm/index.js")).href);
}

function extractRunText(result) {
  const text =
    (typeof result?.result === "string" && result.result.trim()) ||
    (typeof result?.summary === "string" && result.summary.trim()) ||
    "";
  return text;
}

async function callSdk(apiKey, prompt) {
  const sdk = await loadSdk();
  const { Agent, CursorAgentError } = sdk;

  const localOptions = {
    cwd: WORKSPACE,
    settingSources: bridgeMode === "agent" ? ["project"] : [],
  };

  const baseOptions = {
    apiKey,
    model: { id: modelId },
    local: localOptions,
  };

  try {
    if (bridgeMode === "agent" || bridgeMode === "plan") {
      const agent = await Agent.create({
        ...baseOptions,
        mode: bridgeMode,
      });

      try {
        const run = await agent.send(prompt, { mode: bridgeMode });
        const result = await run.wait();
        if (result.status === "error") {
          throw new Error(
            `Cursor run failed (status=error, id=${result.id || "unknown"})`
          );
        }
        const text = extractRunText(result);
        if (!text) {
          throw new Error("Cursor SDK returned no visible text output.");
        }
        return text;
      } finally {
        if (typeof agent.dispose === "function") {
          await agent.dispose().catch(() => {});
        }
      }
    }

    const result = await Agent.prompt(prompt, {
      ...baseOptions,
      mode: "ask",
    });

    if (result.status === "error") {
      throw new Error(`Cursor run failed (status=error, id=${result.id || "unknown"})`);
    }

    const text = extractRunText(result);
    if (!text) {
      throw new Error("Cursor SDK returned no visible text output.");
    }
    return text;
  } catch (err) {
    if (CursorAgentError && err instanceof CursorAgentError) {
      throw new Error(`Cursor startup failed: ${err.message}`);
    }
    throw err;
  }
}

async function main() {
  const prompt = await readPrompt();
  const apiKey = process.env.CURSOR_API_KEY?.trim();

  let text;
  if (apiKey) {
    text = await callSdk(apiKey, prompt);
  } else if (await isAgentLoggedIn()) {
    text = await callAgentCli(prompt);
  } else {
    console.error(
      "ERROR: Cursor not configured. Either set CURSOR_API_KEY in ~/.hermes/.env or run: agent login"
    );
    process.exit(1);
  }
  process.stdout.write(text);
}

main().catch((err) => {
  console.error(`ERROR: ${String(err?.message || err)}`);
  process.exit(1);
});
