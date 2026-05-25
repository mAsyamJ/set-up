const express = require("express");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");

const execFileAsync = promisify(execFile);

const LINUX_MAX_ARG_STRLEN = 131072;
const KIRO_AUTH_EXIT = 42;
const AUTH_FAILURE_RE = /not logged in|kiro-cli login/i;
const DEBUG_BRIDGE = process.env.AEGIS_BRIDGE_DEBUG === "1";

function debugLog(_location, _message, _data, _hypothesisId) {
  if (!DEBUG_BRIDGE) return;
}

const app = express();
app.use(express.json({ limit: "20mb" }));

const HARNESS_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_PROJECT_ROOT = path.join(HARNESS_ROOT, "projects", "aegis-rpc");

const WORKSPACE =
  process.env.AEGIS_WORKSPACE ||
  process.env.AEGIS_REPO_PATH ||
  DEFAULT_PROJECT_ROOT;

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

const SSE_HEARTBEAT_MS = Number(process.env.AEGIS_BRIDGE_SSE_HEARTBEAT_MS || 18000);
const BRIDGE_TIMEOUT_CAP_MS = Number(process.env.AEGIS_BRIDGE_TIMEOUT_CAP_MS || 3600000);

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

function runtimeTruthLines(providerModel) {
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
    identityLine,
    "- Always return visible text. Never return an empty response.",
    ...constraints,
  ];
}

function messagesToPrompt(messages, providerModel) {
  const normalized = (messages || [])
    .map((m) => {
      const role = String(m.role || "user").toUpperCase();
      const content = normalizeContent(m.content);
      return `${role}:\n${content}`;
    })
    .join("\n\n");

  const hivemindBlock = buildHivemindContext();
  const sections = runtimeTruthLines(providerModel);

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

function resolveProviderModel(requestModel) {
  const requested = String(requestModel || "").trim();
  const known = modelState.listProviders();
  const resolved = known.includes(requested)
    ? requested
    : modelState.getDefaultModel();

  // #region agent log
  debugLog(
    "server.js:resolveProviderModel",
    "provider routing",
    {
      requestModel: requested || null,
      resolved,
      persistedDefault: modelState.getDefaultModel(),
      honoredRequest: known.includes(requested),
    },
    "H2"
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
  const type = parsed.isAuthFailure
    ? "authentication_error"
    : parsed.isTimeout
      ? "timeout_error"
      : "connection_error";

  return {
    error: {
      message: parsed.isTimeout
        ? `${parsed.message} Local provider exceeded its time limit (large session). Send /reset in Telegram, then use Kanban or scripts/aegis-pm-orchestrate-once.sh for long orchestration — not a single Telegram turn.`
        : parsed.message,
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

async function callKiro(prompt, { messageCount = 0 } = {}) {
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
        cwd: WORKSPACE,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024 * 12,
        env: {
          ...process.env,
          AEGIS_WORKSPACE: WORKSPACE,
          AEGIS_REPO_PATH: WORKSPACE,
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
      `- workspace: ${WORKSPACE}`,
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

async function callCursor(prompt, { messageCount = 0 } = {}) {
  if (!modelState.isCursorConfigured()) {
    throw new Error(modelState.CURSOR_NOT_CONFIGURED_MESSAGE);
  }

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
      cwd: WORKSPACE,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 12,
      env: {
        ...process.env,
        AEGIS_WORKSPACE: WORKSPACE,
        AEGIS_REPO_PATH: WORKSPACE,
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
      `- workspace: ${WORKSPACE}`,
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

async function callProvider(providerModel, prompt, { messageCount = 0 } = {}) {
  if (providerModel === "cursor-composer-2") {
    return callCursor(prompt, { messageCount });
  }

  try {
    return await callKiro(prompt, { messageCount });
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

    if (parsed.isAuthFailure && modelState.isCursorConfigured()) {
      console.warn(
        "[model-bridge] Kiro not logged in; auto-fallback to cursor-composer-2"
      );
      // #region agent log
      debugLog(
        "server.js:callProvider:cursor-fallback",
        "falling back to cursor after kiro auth failure",
        { from: "kiro-current", to: "cursor-composer-2" },
        "H3"
      );
      // #endregion
      return callCursor(prompt, { messageCount });
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

function writeSseKeepalive(res, id, model) {
  writeSse(res, sseChunk(id, model, { content: "" }));
  if (typeof res.flush === "function") {
    res.flush();
  }
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
}) {
  initSseStream(res, id, model);
  writeSseKeepalive(res, id, model);

  const promptBytes = Buffer.byteLength(prompt, "utf8");
  const timeoutMs = resolveProviderTimeout(providerModel, { promptBytes, messageCount });
  console.log("[model-bridge] stream provider timeout ms:", timeoutMs, {
    providerModel,
    messageCount,
    promptBytes,
  });

  let settled = false;
  const providerResult = callProvider(providerModel, prompt, { messageCount })
    .then((output) => ({ ok: true, output }))
    .catch((err) => ({ ok: false, err }))
    .finally(() => {
      settled = true;
    });

  const heartbeat = setInterval(() => {
    if (settled || res.writableEnded) {
      clearInterval(heartbeat);
      return;
    }
    try {
      writeSseKeepalive(res, id, model);
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
    throw result.err;
  }

  writeSseContentChunks(res, id, model, result.output);
  finishSseStream(res, id, model);
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
  res.json({
    ok: true,
    provider: defaultModel,
    defaultModel,
    workspace: WORKSPACE,
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
      cwd: WORKSPACE,
      timeout: 15000,
      env: process.env,
    });
    const whoami = await execFileAsync("kiro-cli", ["whoami"], {
      cwd: WORKSPACE,
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

    const providerModel = resolveProviderModel(requestModel);

    console.log("[model-bridge] /v1/chat/completions", {
      stream,
      requestModel,
      providerModel,
      messageCount: Array.isArray(messages) ? messages.length : 0,
      hasTools: Boolean(body.tools),
      toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
    });

    if (providerModel === "cursor-composer-2" && !modelState.isCursorConfigured()) {
      const error = {
        error: {
          message: `${modelState.CURSOR_NOT_CONFIGURED_MESSAGE} Switch back with /provider kiro.`,
          type: "invalid_request_error",
        },
      };
      if (stream) {
        res.status(400);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.write(`data: ${JSON.stringify(error)}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      return res.status(400).json(error);
    }

    const prompt = messagesToPrompt(messages, providerModel);

    // #region agent log
    debugLog(
      "server.js:chat/completions:prompt-built",
      "prompt assembled for provider",
      {
        providerModel,
        requestModel,
        messageCount: Array.isArray(messages) ? messages.length : 0,
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

    const messageCount = Array.isArray(messages) ? messages.length : 0;

    if (stream) {
      await streamWithProviderHeartbeat({
        res,
        id,
        model: providerModel,
        providerModel,
        prompt,
        messageCount,
      });
      return;
    }

    const output = await callProvider(providerModel, prompt, { messageCount });
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

    if (req.body?.stream) {
      writeSseErrorAndEnd(res, status, errorPayload);
      return;
    }

    return res.status(status).json(errorPayload);
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, "127.0.0.1", () => {
  const defaultModel = modelState.getDefaultModel();
  console.log(`Hermes multi-provider bridge listening on http://127.0.0.1:${port}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`Default model: ${defaultModel}`);
  console.log(`Kiro provider: ${KIRO_PROVIDER}`);
  console.log(`Cursor provider: ${CURSOR_PROVIDER}`);
  console.log(`State file: ${modelState.STATE_PATH}`);
});
