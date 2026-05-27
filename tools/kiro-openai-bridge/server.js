const express = require("express");
const fs = require("node:fs");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");

const execFileAsync = promisify(execFile);

const LINUX_MAX_ARG_STRLEN = 131072;
const KIRO_AUTH_EXIT = 42;
const AUTH_FAILURE_RE = /not logged in|kiro-cli login/i;
const DEBUG_BRIDGE = process.env.AEGIS_BRIDGE_DEBUG === "1";
const DEBUG_SESSION_ID = "5d3eff";

const HARNESS_ROOT_EARLY = path.resolve(__dirname, "../..");
const DEBUG_LOG_PATH =
  process.env.AEGIS_DEBUG_LOG ||
  path.join(HARNESS_ROOT_EARLY, ".cursor/debug-5d3eff.log");

function agentDebugLog(location, message, data, hypothesisId) {
  const payload = {
    sessionId: DEBUG_SESSION_ID,
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
    runId: process.env.AEGIS_DEBUG_RUN_ID || "pre-fix",
  };
  try {
    fs.appendFileSync(DEBUG_LOG_PATH, `${JSON.stringify(payload)}\n`);
  } catch {
    // ignore
  }
  fetch("http://127.0.0.1:7481/ingest/99afa3da-7bb4-40c2-b010-dc3ec090006a", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function debugLog(location, message, data, hypothesisId) {
  if (!DEBUG_BRIDGE) return;
  agentDebugLog(location, message, data, hypothesisId);
}

const app = express();
app.use(express.json({ limit: "20mb" }));

const HARNESS_ROOT = HARNESS_ROOT_EARLY;
const DEFAULT_PROJECT_ROOT = path.join(HARNESS_ROOT, "projects", "aegis-rpc");
const { resolveActiveWorkspace } = require(path.join(
  HARNESS_ROOT,
  "scripts/lib/resolve-active-workspace.cjs"
));

function getWorkspace() {
  return resolveActiveWorkspace(HARNESS_ROOT, DEFAULT_PROJECT_ROOT);
}

const KIRO_PROVIDER =
  process.env.KIRO_PROVIDER ||
  `${HARNESS_ROOT}/scripts/providers/kiro-provider.sh`;

const CURSOR_PROVIDER =
  process.env.CURSOR_PROVIDER ||
  `${HARNESS_ROOT}/scripts/providers/cursor-provider.mjs`;

const NODE_BIN =
  process.env.AEGIS_NODE ||
  process.execPath;

const modelState = require(path.join(HARNESS_ROOT, "scripts/lib/aegis-model-state.cjs"));

let buildHivemindContext = () => "";

try {
  const mod = require(path.join(HARNESS_ROOT, "scripts/lib/hivemind-bridge-context.cjs"));
  buildHivemindContext = mod.buildSnippet;
} catch (err) {
  console.warn("[model-bridge] hivemind context module not loaded:", err.message);
}

const PROVIDERS = {
  "kiro-current": {
    id: "kiro-current",
    ownedBy: "local-kiro",
    timeout: Number(process.env.KIRO_BRIDGE_TIMEOUT_MS || 1200000),
    label: "Kiro CLI",
  },
  "cursor-composer-2": {
    id: "cursor-composer-2",
    ownedBy: "local-cursor",
    timeout: Number(process.env.CURSOR_BRIDGE_TIMEOUT_MS || 1200000),
    label: "Cursor SDK (local)",
  },
};

const SSE_HEARTBEAT_MS = Number(process.env.AEGIS_BRIDGE_SSE_HEARTBEAT_MS || 12000);
const BRIDGE_TIMEOUT_CAP_MS = Number(process.env.AEGIS_BRIDGE_TIMEOUT_CAP_MS || 3600000);
const HERMES_MAX_MESSAGES = Number(process.env.AEGIS_BRIDGE_HERMES_MAX_MESSAGES || 45);
const CURSOR_AGENT_MAX_MESSAGES = Number(
  process.env.AEGIS_BRIDGE_CURSOR_AGENT_MAX_MESSAGES || 24
);
const PROVIDER_AUTH_CACHE_MS = Number(process.env.AEGIS_BRIDGE_AUTH_CACHE_MS || 30000);

let _providerAuthCache = {
  at: 0,
  cursor: false,
  kiro: false,
};

async function refreshProviderAuthCache() {
  const now = Date.now();
  if (now - _providerAuthCache.at < PROVIDER_AUTH_CACHE_MS) {
    return _providerAuthCache;
  }
  _providerAuthCache.cursor = modelState.isCursorConfigured();
  try {
    const { stdout, stderr } = await execFileAsync("kiro-cli", ["whoami"], {
      cwd: getWorkspace(),
      timeout: 10000,
      env: process.env,
    });
    const text = String(stdout || stderr || "");
    _providerAuthCache.kiro = !/not logged in/i.test(text);
  } catch {
    _providerAuthCache.kiro = false;
  }
  _providerAuthCache.at = now;
  return _providerAuthCache;
}

function isCursorReady() {
  if (Date.now() - _providerAuthCache.at < PROVIDER_AUTH_CACHE_MS) {
    return _providerAuthCache.cursor;
  }
  return modelState.isCursorConfigured();
}

function hermesSessionLimitMessage(messageCount) {
  return [
    `Telegram session too large (${messageCount} messages; bridge max ${HERMES_MAX_MESSAGES}).`,
    "",
    "Send **/reset** in Telegram to start fresh.",
    "For implementation work use **Kanban** or **cursor-fleet** — not long Telegram chat turns.",
  ].join("\n");
}

/**
 * Scale subprocess timeout for large Hermes sessions (many messages / big prompt).
 * Prevents SIGTERM at 10m while user still sees "receiving stream response" heartbeats.
 */
function resolveProviderTimeout(providerModel, { promptBytes = 0, messageCount = 0 } = {}) {
  const base = PROVIDERS[providerModel]?.timeout || 1200000;
  let timeout = base;

  if (promptBytes > 300_000 || messageCount >= 55) {
    timeout = Math.max(timeout, 3_600_000);
  } else if (promptBytes > 150_000 || messageCount >= 40) {
    timeout = Math.max(timeout, 2_400_000);
  } else if (promptBytes > 80_000 || messageCount >= 25) {
    timeout = Math.max(timeout, 1_800_000);
  }

  return Math.min(timeout, BRIDGE_TIMEOUT_CAP_MS);
}

function cleanKiroOutput(stdout) {
  return String(stdout || "")
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/All tools are now trusted[\s\S]*?using-tools-trust-all-safely\n\n/m, "")
    .replace(/▸ Credits:[\s\S]*$/m, "")
    .replace(/^>\s?/gm, "")
    .trim();
}

function normalizeContent(content) {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && part.type === "text") return part.text || "";
        return JSON.stringify(part);
      })
      .filter(Boolean)
      .join("\n");
  }

  if (content == null) return "";
  return JSON.stringify(content);
}

function runtimeTruthLines(providerModel, workspace) {
  const isCursor = providerModel === "cursor-composer-2";
  const cursorMode = modelState.getCursorBridgeMode();
  const backendLine = isCursor
    ? `- Cursor Agent (local, mode=${cursorMode}) is the coding backend behind this custom provider.`
    : "- Kiro is the local inference/coding backend behind this custom provider.";
  const identityLine = isCursor
    ? "- If asked who you are, say: Hermes Agent runtime using a local Cursor bridge provider."
    : "- If asked who you are, say: Hermes Agent runtime using a local Kiro bridge provider.";
  let constraints = [];
  if (isCursor) {
    if (cursorMode === "agent") {
      constraints = [
        "- You may edit files and run shell commands in the workspace when needed to fulfill the task.",
        "- Return assistant text summarizing what you did. Hermes owns gateway actions; you own repo changes for this request.",
      ];
    } else {
      constraints = [
        "- You are a TEXT-ONLY model backend. Do not edit files, run shell commands, or invoke tools.",
        "- Return assistant text only. Hermes owns tools, skills, memory, and gateway actions.",
      ];
    }
  }

  return [
    "You are acting as the model backend for Nous Hermes Agent.",
    "",
    "Runtime truth:",
    "- Hermes Agent is the runtime with tools, skills, memory, cron, and gateway.",
    backendLine,
    "- Hivemind (Deeplake) is SHARED org memory across Cursor, Hermes, and Codex on this machine.",
    "- If asked whether memory is shared across Kiro/Cursor/Hermes: say YES for Hivemind; Kiro IDE uses hivemind MCP; this Telegram path gets the excerpt below.",
    "- Agent Harness OS (doc-10 local control plane): typed tool gateway, harness MCP, RAG with source priority, Obsidian vault summaries, A2A on 127.0.0.1:8790, TS supervisor.",
    "- Harness CLI: cli/harness {doctor,index-project,obsidian,run-task,start-mcp,start-a2a,sync-hermes}. Vault: ~/dev/Project/_vaults/agentic-engineering (UNTRUSTED_CONTEXT in RAG).",
    "- If asked about new capabilities after upgrade: describe Agent Harness OS additions (MCP, RAG, Obsidian, A2A), not only generic Hermes platform tools. Load skill agent-harness-os.",
    identityLine,
    "- Always return visible text. Never return an empty response.",
    ...constraints,
    ...harnessManifestLines(workspace),
  ];
}

let _manifestCache = { at: 0, workspace: "", lines: [] };

function harnessManifestLines(workspace) {
  const now = Date.now();
  if (
    now - _manifestCache.at < 60_000 &&
    _manifestCache.workspace === workspace
  ) {
    return _manifestCache.lines;
  }
  _manifestCache.at = now;
  _manifestCache.workspace = workspace;
  _manifestCache.lines = [];
  try {
    const manifestPath = path.join(workspace, ".harness", "project.manifest.json");
    if (!fs.existsSync(manifestPath)) return [];
    const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const name = m?.project?.name || "unknown";
    const desc = (m?.project?.description || "").slice(0, 120);
    _manifestCache.lines = [
      "",
      "Active harness project (from manifest):",
      `- name: ${name}`,
      desc ? `- description: ${desc}` : "",
    ].filter(Boolean);
  } catch {
    _manifestCache.lines = [];
  }
  return _manifestCache.lines;
}

function messagesToPrompt(messages, providerModel, workspace) {
  const normalized = (messages || [])
    .map((m) => {
      const role = String(m.role || "user").toUpperCase();
      const content = normalizeContent(m.content);
      return `${role}:\n${content}`;
    })
    .join("\n\n");

  const hivemindBlock = buildHivemindContext();
  const sections = runtimeTruthLines(providerModel, workspace);

  if (hivemindBlock) {
    sections.push("", hivemindBlock);
  }

  sections.push("", "Conversation:", normalized);
  return sections.join("\n");
}

/** Prefer argv for provider spawn; Node execFile `input` stdin can hang on some shells. */
function providerSpawnPlan(prompt) {
  const promptBytes = Buffer.byteLength(prompt, "utf8");
  const useArgv =
    promptBytes > 0 && promptBytes < LINUX_MAX_ARG_STRLEN - 4096;
  return {
    promptBytes,
    useArgv,
    transport: useArgv ? "argv" : "stdin",
  };
}

function resolveProviderModel(requestModel, { messageCount = 0 } = {}) {
  const requested = String(requestModel || "").trim();
  const known = modelState.listProviders();
  let resolved = known.includes(requested)
    ? requested
    : modelState.getDefaultModel();

  const cursorReady = isCursorReady();
  const kiroReady = _providerAuthCache.kiro;

  if (resolved === "cursor-composer-2" && !cursorReady) {
    if (kiroReady) {
      console.warn(
        "[model-bridge] cursor-composer-2 not configured; routing to kiro-current"
      );
      resolved = "kiro-current";
    }
  }

  if (resolved === "kiro-current" && !kiroReady && cursorReady) {
    console.warn("[model-bridge] kiro-current not logged in; routing to cursor-composer-2");
    resolved = "cursor-composer-2";
  }

  // Large Telegram sessions: avoid full Cursor agent runs (30+ min). Use ask mode via callCursor env.
  if (
    resolved === "cursor-composer-2" &&
    messageCount > CURSOR_AGENT_MAX_MESSAGES
  ) {
    console.warn(
      `[model-bridge] large session (${messageCount} msgs); cursor will use ask mode`
    );
  }

  // #region agent log
  agentDebugLog(
    "server.js:resolveProviderModel",
    "provider routing",
    {
      requestModel: requested || null,
      resolved,
      messageCount,
      persistedDefault: modelState.getDefaultModel(),
      honoredRequest: known.includes(requested),
      cursorReady,
      kiroReady,
    },
    "H3"
  );
  // #endregion

  return resolved;
}

function parseProviderExecError(err) {
  const stderr = String(err?.stderr || "").trim();
  const rawMessage = String(err?.message || err);
  const exitCode = Number.isInteger(err?.code) ? err.code : null;

  let message = stderr.split("\n").find(Boolean) || rawMessage;
  if (/^Command failed:/i.test(rawMessage)) {
    message =
      stderr.split("\n").find(Boolean) ||
      "Provider command failed (see bridge logs for details).";
  }

  const isAuthFailure =
    exitCode === KIRO_AUTH_EXIT || AUTH_FAILURE_RE.test(`${stderr}\n${message}`);
  const isTimeout =
    (err?.killed && err?.signal === "SIGTERM") || /timed out/i.test(rawMessage);
  const isE2BIG = err?.code === "E2BIG" || /E2BIG/i.test(rawMessage);

  return { message, stderr, isAuthFailure, isTimeout, isE2BIG, exitCode };
}

function bridgeErrorPayload(err) {
  const parsed = err?.providerParsed || parseProviderExecError(err);
  let message = parsed.message;

  if (/connection lost|exceeded max retries|failed to run step/i.test(message)) {
    message = [
      "Cursor Agent lost its cloud connection (agent CLI).",
      "",
      "Fix for 24/7 Telegram:",
      "1. Set CURSOR_API_KEY in ~/.hermes/.env (most stable), then: systemctl --user restart kiro-openai-bridge",
      "2. Or run: kiro-cli login — then /provider kiro in Telegram + /reset",
      "3. Send /reset if the session is large (>45 messages).",
      "",
      `Details: ${parsed.message.split("\n")[0]}`,
    ].join("\n");
  }

  const type = parsed.isAuthFailure
    ? "authentication_error"
    : parsed.isTimeout
      ? "timeout_error"
      : "connection_error";

  return {
    error: {
      message: parsed.isTimeout
        ? `${parsed.message} Local provider exceeded its time limit (large session). Send /reset in Telegram, then use Kanban or scripts/aegis-pm-orchestrate-once.sh for long orchestration — not a single Telegram turn.`
        : message,
      type,
      ...(parsed.isAuthFailure
        ? {
            hint: "Run once in a terminal: kiro-cli login — or switch provider: scripts/aegis-model.sh cursor",
          }
        : parsed.isTimeout
          ? {
              hint: "Increase CURSOR_BRIDGE_TIMEOUT_MS / KIRO_BRIDGE_TIMEOUT_MS or shorten the Hermes session with /reset.",
            }
          : {}),
    },
  };
}

function providerHttpStatus(err) {
  const parsed = err?.providerParsed || parseProviderExecError(err);
  if (parsed.isAuthFailure) return 401;
  if (parsed.isTimeout) return 504;
  if (parsed.isE2BIG) return 413;
  return 502;
}

function enrichProviderError(err) {
  const parsed = parseProviderExecError(err);
  err.providerParsed = parsed;
  err.message = parsed.message;
  return err;
}

async function callKiro(prompt, { messageCount = 0, workspace } = {}) {
  const ws = workspace || getWorkspace();
  const startedAt = Date.now();
  const promptBytes = Buffer.byteLength(prompt, "utf8");
  const timeoutMs = resolveProviderTimeout("kiro-current", { promptBytes, messageCount });
  const envBytes = Buffer.byteLength(JSON.stringify(process.env), "utf8");

  // #region agent log
  debugLog(
    "server.js:callKiro:pre-spawn",
    "kiro spawn sizing",
    {
      promptBytes,
      envBytes,
      linuxMaxArgStrlen: LINUX_MAX_ARG_STRLEN,
      exceedsMaxArgStrlen: promptBytes > LINUX_MAX_ARG_STRLEN,
      provider: "kiro-current",
    },
    "H1"
  );
  // #endregion

  const spawn = providerSpawnPlan(prompt);

  try {
    const { stdout, stderr } = await execFileAsync(
      KIRO_PROVIDER,
      spawn.useArgv ? [prompt] : [],
      {
        input: spawn.useArgv ? undefined : prompt,
        cwd: ws,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024 * 12,
        env: {
          ...process.env,
          AEGIS_WORKSPACE: ws,
          AEGIS_REPO_PATH: ws,
          FORCE_COLOR: "0",
          NO_COLOR: "1",
        },
      }
    );

  const rawStdout = String(stdout || "");
  const rawStderr = String(stderr || "");

  console.log("[model-bridge] kiro timeout ms:", timeoutMs, "messages:", messageCount);
  console.log("[model-bridge] kiro stdout chars:", rawStdout.length);
  console.log("[model-bridge] kiro stderr chars:", rawStderr.length);
  console.log("[model-bridge] kiro duration ms:", Date.now() - startedAt);

  if (rawStderr.trim()) {
    console.error("[model-bridge kiro stderr]", rawStderr.slice(0, 2000));
  }

  const cleanedStdout = cleanKiroOutput(rawStdout);
  const cleanedStderr = cleanKiroOutput(rawStderr);
  const output = cleanedStdout || cleanedStderr;

  if (!output.trim()) {
    return [
      "Kiro bridge reached Kiro, but Kiro returned no visible output.",
      "",
      "Diagnostics:",
      `- stdout chars: ${rawStdout.length}`,
      `- stderr chars: ${rawStderr.length}`,
      `- provider: ${KIRO_PROVIDER}`,
      `- workspace: ${ws}`,
    ].join("\n");
  }

  return output.trim();
  } catch (err) {
    // #region agent log
    debugLog(
      "server.js:callKiro:spawn-error",
      "kiro spawn failed",
      {
        promptBytes,
        errCode: err?.code,
        errMessage: String(err?.message || err).slice(0, 500),
        isE2BIG: err?.code === "E2BIG" || /E2BIG/.test(String(err?.message)),
      },
      "H1"
    );
    // #endregion
    throw enrichProviderError(err);
  }
}

async function callCursor(prompt, { messageCount = 0, workspace } = {}) {
  if (!isCursorReady()) {
    throw new Error(modelState.CURSOR_NOT_CONFIGURED_MESSAGE);
  }

  const ws = workspace || getWorkspace();
  const useAskMode = messageCount > CURSOR_AGENT_MAX_MESSAGES;
  const cursorBridgeMode = useAskMode
    ? "ask"
    : modelState.getCursorBridgeMode();

  const startedAt = Date.now();
  const promptBytes = Buffer.byteLength(prompt, "utf8");
  const timeoutMs = resolveProviderTimeout("cursor-composer-2", { promptBytes, messageCount });

  // #region agent log
  const spawn = providerSpawnPlan(prompt);

  // #region agent log
  debugLog(
    "server.js:callCursor:pre-spawn",
    "cursor spawn sizing",
    {
      promptBytes: spawn.promptBytes,
      linuxMaxArgStrlen: LINUX_MAX_ARG_STRLEN,
      exceedsMaxArgStrlen: spawn.promptBytes > LINUX_MAX_ARG_STRLEN,
      transport: spawn.transport,
      provider: "cursor-composer-2",
    },
    "H1"
  );
  // #endregion

  try {
  const { stdout, stderr } = await execFileAsync(
    NODE_BIN,
    spawn.useArgv ? [CURSOR_PROVIDER, prompt] : [CURSOR_PROVIDER],
    {
      input: spawn.useArgv ? undefined : prompt,
      cwd: ws,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 12,
      env: {
        ...process.env,
        AEGIS_WORKSPACE: ws,
        AEGIS_REPO_PATH: ws,
        CURSOR_BRIDGE_MODE: cursorBridgeMode,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
      },
    }
  );

  const rawStdout = String(stdout || "");
  const rawStderr = String(stderr || "");

  console.log("[model-bridge] cursor timeout ms:", timeoutMs, "messages:", messageCount);
  console.log("[model-bridge] cursor stdout chars:", rawStdout.length);
  console.log("[model-bridge] cursor stderr chars:", rawStderr.length);
  console.log("[model-bridge] cursor duration ms:", Date.now() - startedAt);

  if (rawStderr.trim()) {
    console.error("[model-bridge cursor stderr]", rawStderr.slice(0, 2000));
  }

  const output = rawStdout.trim() || cleanKiroOutput(rawStderr);

  if (!output.trim()) {
    return [
      "Cursor bridge reached Cursor SDK, but no visible output was returned.",
      "",
      "Diagnostics:",
      `- stdout chars: ${rawStdout.length}`,
      `- stderr chars: ${rawStderr.length}`,
      `- provider: ${CURSOR_PROVIDER}`,
      `- workspace: ${ws}`,
    ].join("\n");
  }

  return output.trim();
  } catch (err) {
    // #region agent log
    debugLog(
      "server.js:callCursor:spawn-error",
      "cursor spawn failed",
      {
        promptBytes,
        errCode: err?.code,
        errMessage: String(err?.message || err).slice(0, 500),
        isE2BIG: err?.code === "E2BIG" || /E2BIG/.test(String(err?.message)),
      },
      "H1"
    );
    // #endregion
    throw enrichProviderError(err);
  }
}

async function callProvider(providerModel, prompt, { messageCount = 0, workspace } = {}) {
  if (providerModel === "cursor-composer-2") {
    return callCursor(prompt, { messageCount, workspace });
  }

  try {
    return await callKiro(prompt, { messageCount, workspace });
  } catch (err) {
    const parsed = err?.providerParsed || parseProviderExecError(err);

    // #region agent log
    debugLog(
      "server.js:callProvider:kiro-failed",
      "kiro provider error",
      {
        isAuthFailure: parsed.isAuthFailure,
        exitCode: parsed.exitCode,
        message: parsed.message.slice(0, 300),
        cursorConfigured: modelState.isCursorConfigured(),
      },
      "H3"
    );
    // #endregion

    if (parsed.isAuthFailure && isCursorReady()) {
      console.warn(
        "[model-bridge] Kiro not logged in; auto-fallback to cursor-composer-2"
      );
      // #region agent log
      agentDebugLog(
        "server.js:callProvider:cursor-fallback",
        "falling back to cursor after kiro auth failure",
        { from: "kiro-current", to: "cursor-composer-2", messageCount },
        "H3"
      );
      // #endregion
      return callCursor(prompt, { messageCount, workspace });
    }

    throw enrichProviderError(err);
  }
}

function nonStreamResponse({ id, model, content }) {
  return {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: String(content || "No content."),
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 1,
      completion_tokens: Math.max(1, String(content || "").split(/\s+/).length),
      total_tokens: Math.max(2, String(content || "").split(/\s+/).length + 1),
    },
  };
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function sseChunk(id, model, delta, finishReason = null) {
  return {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

function initSseStream(res, id, model) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  writeSse(res, sseChunk(id, model, { role: "assistant" }));
}

function writeSseKeepalive(res, id, model, seq = 0) {
  // SSE comments keep the connection alive without polluting assistant content.
  res.write(`: keepalive ${seq}\n\n`);
  if (typeof res.flush === "function") {
    res.flush();
  }
}

function writeSseErrorAsContentAndEnd(res, id, model, errorPayload) {
  const message =
    errorPayload?.error?.message ||
    (typeof errorPayload === "string" ? errorPayload : "Provider error.");
  if (!res.headersSent) {
    initSseStream(res, id, model);
  }
  writeSseContentChunks(res, id, model, message);
  finishSseStream(res, id, model);
}

function writeSseContentChunks(res, id, model, content) {
  const text = String(content || "No content.");
  const chunkSize = 800;
  for (let i = 0; i < text.length; i += chunkSize) {
    writeSse(res, sseChunk(id, model, { content: text.slice(i, i + chunkSize) }));
  }
}

function finishSseStream(res, id, model) {
  writeSse(res, sseChunk(id, model, {}, "stop"));
  res.write("data: [DONE]\n\n");
  res.end();
}

function writeSseErrorAndEnd(res, status, errorPayload) {
  if (!res.headersSent) {
    res.status(status);
    initSseStream(res, `chatcmpl_${Date.now()}`, "unknown");
  } else if (status >= 400) {
    res.statusCode = status;
  }
  writeSse(res, errorPayload);
  res.write("data: [DONE]\n\n");
  res.end();
}

/**
 * Start SSE immediately and emit keepalive chunks while the local provider runs.
 * Avoids Hermes "no chunks yet" stalls and reduces spurious stale-stream kills.
 */
async function streamWithProviderHeartbeat({
  res,
  id,
  model,
  providerModel,
  prompt,
  messageCount = 0,
  workspace,
  sseAlreadyStarted = false,
}) {
  const streamStartedAt = Date.now();
  if (!sseAlreadyStarted) {
    initSseStream(res, id, model);
    writeSseKeepalive(res, id, model, 1);
  }

  // #region agent log
  agentDebugLog(
    "server.js:streamWithProviderHeartbeat:start",
    "SSE stream opened",
    { providerModel, messageCount, workspace, promptBytes: Buffer.byteLength(prompt, "utf8") },
    "H1"
  );
  // #endregion

  res.on("close", () => {
    if (!res.writableEnded) {
      // #region agent log
      agentDebugLog(
        "server.js:streamWithProviderHeartbeat:client-close",
        "client disconnected before stream finished",
        {
          providerModel,
          elapsedMs: Date.now() - streamStartedAt,
          writableEnded: res.writableEnded,
        },
        "H1"
      );
      // #endregion
    }
  });

  const promptBytes = Buffer.byteLength(prompt, "utf8");
  const timeoutMs = resolveProviderTimeout(providerModel, { promptBytes, messageCount });
  console.log("[model-bridge] stream provider timeout ms:", timeoutMs, {
    providerModel,
    messageCount,
    promptBytes,
    workspace,
  });

  let settled = false;
  const providerResult = callProvider(providerModel, prompt, { messageCount, workspace })
    .then((output) => ({ ok: true, output }))
    .catch((err) => ({ ok: false, err }))
    .finally(() => {
      settled = true;
    });

  let heartbeatSeq = 0;
  const heartbeat = setInterval(() => {
    if (settled || res.writableEnded) {
      clearInterval(heartbeat);
      return;
    }
    try {
      heartbeatSeq += 1;
      writeSseKeepalive(res, id, model, heartbeatSeq);
      if (heartbeatSeq % 5 === 0) {
        // #region agent log
        agentDebugLog(
          "server.js:streamWithProviderHeartbeat:keepalive",
          "progress keepalive sent",
          {
            providerModel,
            heartbeatSeq,
            elapsedMs: Date.now() - streamStartedAt,
          },
          "H4"
        );
        // #endregion
      }
    } catch (err) {
      console.warn("[model-bridge] SSE keepalive failed:", err?.message || err);
      clearInterval(heartbeat);
    }
  }, SSE_HEARTBEAT_MS);

  const result = await providerResult;
  clearInterval(heartbeat);

  if (res.writableEnded) {
    return;
  }

  if (!result.ok) {
    const errorPayload = bridgeErrorPayload(result.err);
    // #region agent log
    agentDebugLog(
      "server.js:streamWithProviderHeartbeat:provider-error",
      "streaming provider error as assistant content",
      {
        providerModel,
        message: errorPayload.error.message.slice(0, 300),
        elapsedMs: Date.now() - streamStartedAt,
      },
      "H6"
    );
    // #endregion
    writeSseErrorAsContentAndEnd(res, id, model, errorPayload);
    return;
  }

  writeSseContentChunks(res, id, model, result.output);
  finishSseStream(res, id, model);

  // #region agent log
  agentDebugLog(
    "server.js:streamWithProviderHeartbeat:complete",
    "SSE stream finished",
    { providerModel, elapsedMs: Date.now() - streamStartedAt },
    "H1"
  );
  // #endregion
}

function streamResponse({ res, id, model, content }) {
  initSseStream(res, id, model);
  writeSseContentChunks(res, id, model, content);
  finishSseStream(res, id, model);
}

function providerStatusPayload() {
  const state = modelState.readState();
  return {
    defaultModel: state.defaultModel,
    updatedAt: state.updatedAt,
    updatedBy: state.updatedBy,
    available: modelState.listProviders().map((id) => ({
      id,
      label: PROVIDERS[id]?.label || id,
      ready: id === "cursor-composer-2" ? modelState.isCursorConfigured() : true,
    })),
    cursorConfigured: modelState.isCursorConfigured(),
    cursorBridgeMode: modelState.getCursorBridgeMode(),
    statePath: modelState.STATE_PATH,
  };
}

app.get("/health", (_req, res) => {
  const defaultModel = modelState.getDefaultModel();
  const workspace = getWorkspace();
  res.json({
    ok: true,
    provider: defaultModel,
    defaultModel,
    workspace,
    providers: {
      kiro: { script: KIRO_PROVIDER, model: "kiro-current" },
      cursor: {
        script: CURSOR_PROVIDER,
        model: "cursor-composer-2",
        configured: modelState.isCursorConfigured(),
        bridgeMode: modelState.getCursorBridgeMode(),
      },
    },
    kiroProvider: KIRO_PROVIDER,
  });
});

app.get("/health/ready", async (_req, res) => {
  if (process.env.KIRO_HEALTH_CHECK !== "1") {
    return res.json({
      ok: true,
      kiro: "skipped",
      cursor: modelState.isCursorConfigured() ? "configured" : "not_configured",
    });
  }

  try {
    await execFileAsync("kiro-cli", ["--version"], {
      cwd: getWorkspace(),
      timeout: 15000,
      env: process.env,
    });
    const whoami = await execFileAsync("kiro-cli", ["whoami"], {
      cwd: getWorkspace(),
      timeout: 15000,
      env: process.env,
    });
    const whoamiText = String(whoami.stdout || whoami.stderr || "").trim();
    if (/not logged in/i.test(whoamiText)) {
      return res.status(503).json({
        ok: false,
        kiro: "not_logged_in",
        cursor: modelState.isCursorConfigured() ? "configured" : "not_configured",
        hint: "Run: kiro-cli login",
      });
    }
    return res.json({
      ok: true,
      kiro: "ok",
      cursor: modelState.isCursorConfigured() ? "configured" : "not_configured",
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      kiro: String(err?.message || err),
      cursor: modelState.isCursorConfigured() ? "configured" : "not_configured",
    });
  }
});

app.get("/v1/admin/provider", (_req, res) => {
  res.json(providerStatusPayload());
});

app.post("/v1/admin/provider", (req, res) => {
  const provider = String(req.body?.provider || "").trim();
  if (!provider) {
    return res.status(400).json({
      error: { message: "Missing provider. Use kiro-current or cursor-composer-2.", type: "invalid_request_error" },
    });
  }

  if (!modelState.listProviders().includes(provider)) {
    return res.status(400).json({
      error: {
        message: `Unknown provider: ${provider}. Available: ${modelState.listProviders().join(", ")}`,
        type: "invalid_request_error",
      },
    });
  }

  if (provider === "cursor-composer-2" && !modelState.isCursorConfigured()) {
    return res.status(400).json({
      error: {
        message: modelState.CURSOR_NOT_CONFIGURED_MESSAGE,
        type: "invalid_request_error",
      },
    });
  }

  try {
    const updatedBy = String(req.body?.updatedBy || "admin");
    const state = modelState.setDefaultModel(provider, updatedBy);
    console.log("[model-bridge] default provider switched to", provider, "by", updatedBy);
    return res.json({
      ok: true,
      ...providerStatusPayload(),
      defaultModel: state.defaultModel,
      updatedAt: state.updatedAt,
      updatedBy: state.updatedBy,
    });
  } catch (err) {
    return res.status(400).json({
      error: { message: String(err?.message || err), type: "invalid_request_error" },
    });
  }
});

app.get("/v1/models", (_req, res) => {
  res.json({
    object: "list",
    data: modelState.listProviders().map((id) => ({
      id,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: PROVIDERS[id]?.ownedBy || "local",
    })),
  });
});

app.post("/v1/chat/completions", async (req, res) => {
  const id = `chatcmpl_${Date.now()}`;

  try {
    const body = req.body || {};
    const {
      messages = [],
      model: requestModel = "kiro-current",
      stream = false,
    } = body;

    const messageCount = Array.isArray(messages) ? messages.length : 0;
    await refreshProviderAuthCache();
    const providerModel = resolveProviderModel(requestModel, { messageCount });
    const workspace = getWorkspace();

    console.log("[model-bridge] /v1/chat/completions", {
      stream,
      requestModel,
      providerModel,
      workspace,
      messageCount,
      hasTools: Boolean(body.tools),
      toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
    });

    if (messageCount > HERMES_MAX_MESSAGES) {
      const limitText = hermesSessionLimitMessage(messageCount);
      agentDebugLog(
        "server.js:chat/completions:session-limit",
        "hermes session over limit",
        { messageCount, max: HERMES_MAX_MESSAGES },
        "H5"
      );
      if (stream) {
        initSseStream(res, id, providerModel);
        writeSseContentChunks(res, id, providerModel, limitText);
        finishSseStream(res, id, providerModel);
        return;
      }
      return res.status(413).json({
        error: { message: limitText, type: "invalid_request_error" },
      });
    }

    if (!_providerAuthCache.cursor && !_providerAuthCache.kiro) {
      const msg =
        "No bridge provider ready. Run: agent login OR kiro-cli login (then restart kiro-openai-bridge).";
      if (stream) {
        writeSseErrorAndEnd(res, 503, {
          error: { message: msg, type: "connection_error" },
        });
        return;
      }
      return res.status(503).json({
        error: { message: msg, type: "connection_error" },
      });
    }

    const sseAlreadyStarted = Boolean(stream);
    if (sseAlreadyStarted) {
      initSseStream(res, id, providerModel);
      writeSseKeepalive(res, id, providerModel, 1);
    }

    const prompt = messagesToPrompt(messages, providerModel, workspace);

    // #region agent log
    agentDebugLog(
      "server.js:chat/completions:prompt-built",
      "prompt assembled for provider",
      {
        providerModel,
        requestModel,
        workspace,
        messageCount,
        promptBytes: Buffer.byteLength(prompt, "utf8"),
        bodyBytes: Buffer.byteLength(JSON.stringify(body), "utf8"),
        hasTools: Boolean(body.tools),
        toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
        exceedsMaxArgStrlen:
          Buffer.byteLength(prompt, "utf8") > LINUX_MAX_ARG_STRLEN,
      },
      "H1"
    );
    // #endregion

    if (!prompt.trim()) {
      const error = {
        error: {
          message: "No messages provided",
          type: "invalid_request_error",
        },
      };
      if (stream) {
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.write(`data: ${JSON.stringify(error)}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      return res.status(400).json(error);
    }

    if (stream) {
      await streamWithProviderHeartbeat({
        res,
        id,
        model: providerModel,
        providerModel,
        prompt,
        messageCount,
        workspace,
        sseAlreadyStarted,
      });
      return;
    }

    const output = await callProvider(providerModel, prompt, { messageCount, workspace });
    return res.json(nonStreamResponse({ id, model: providerModel, content: output }));
  } catch (err) {
    console.error("[model-bridge error]", err);

    // #region agent log
    debugLog(
      "server.js:chat/completions:catch",
      "chat completion error",
      {
        errCode: err?.code,
        errMessage: String(err?.message || err).slice(0, 500),
        isE2BIG: err?.code === "E2BIG" || /E2BIG/.test(String(err?.message)),
      },
      "H1"
    );
    // #endregion

    const errorPayload = bridgeErrorPayload(err);
    const status = providerHttpStatus(err);
    const streamModel = resolveProviderModel(req.body?.model, {
      messageCount: Array.isArray(req.body?.messages)
        ? req.body.messages.length
        : 0,
    });

    if (req.body?.stream) {
      writeSseErrorAsContentAndEnd(res, id, streamModel, errorPayload);
      return;
    }

    return res.status(status).json(errorPayload);
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, "127.0.0.1", () => {
  const defaultModel = modelState.getDefaultModel();
  console.log(`Hermes multi-provider bridge listening on http://127.0.0.1:${port}`);
  console.log(`Workspace: ${getWorkspace()} (hot-reload from active-project.env)`);
  console.log(`Default model: ${defaultModel}`);
  console.log(`Hermes max messages: ${HERMES_MAX_MESSAGES}; cursor agent max: ${CURSOR_AGENT_MAX_MESSAGES}`);
  console.log(`Kiro provider: ${KIRO_PROVIDER}`);
  console.log(`Cursor provider: ${CURSOR_PROVIDER}`);
  console.log(`State file: ${modelState.STATE_PATH}`);
  refreshProviderAuthCache()
    .then((auth) => {
      console.log(
        `[model-bridge] provider auth: cursor=${auth.cursor} kiro=${auth.kiro}`
      );
    })
    .catch(() => {});
});
