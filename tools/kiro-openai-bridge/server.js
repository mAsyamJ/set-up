const express = require("express");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");

const execFileAsync = promisify(execFile);

const app = express();
app.use(express.json({ limit: "20mb" }));

const WORKSPACE =
  process.env.AEGIS_WORKSPACE ||
  process.env.AEGIS_REPO_PATH ||
  "/home/asyam/dev/Project/aegis-hackathon-kit";

const KIRO_PROVIDER =
  process.env.KIRO_PROVIDER ||
  `${WORKSPACE}/scripts/providers/kiro-provider.sh`;

let buildHivemindContext = () => "";

try {
  const mod = require(path.join(WORKSPACE, "scripts/lib/hivemind-bridge-context.js"));
  buildHivemindContext = mod.buildSnippet;
} catch (err) {
  console.warn("[kiro-bridge] hivemind context module not loaded:", err.message);
}

function cleanKiroOutput(stdout) {
  return String(stdout || "")
    // Strip ANSI escape/control codes
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    // Remove Kiro trust warning
    .replace(/All tools are now trusted[\s\S]*?using-tools-trust-all-safely\n\n/m, "")
    // Remove Kiro credits footer
    .replace(/▸ Credits:[\s\S]*$/m, "")
    // Remove quote marker
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

function messagesToPrompt(messages) {
  const normalized = (messages || [])
    .map((m) => {
      const role = String(m.role || "user").toUpperCase();
      const content = normalizeContent(m.content);
      return `${role}:\n${content}`;
    })
    .join("\n\n");

  const hivemindBlock = buildHivemindContext();
  const sections = [
    "You are acting as the model backend for Nous Hermes Agent.",
    "",
    "Runtime truth:",
    "- Hermes Agent is the runtime with tools, skills, memory, cron, and gateway.",
    "- Kiro is the local inference/coding backend behind this custom provider.",
    "- Hivemind (Deeplake) is SHARED org memory across Cursor, Hermes, and Codex on this machine.",
    "- If asked whether memory is shared across Kiro/Cursor/Hermes: say YES for Hivemind; Kiro IDE uses hivemind MCP; this Telegram path gets the excerpt below.",
    "- If asked who you are, say: Hermes Agent runtime using a local Kiro bridge provider.",
    "- Always return visible text. Never return an empty response.",
  ];

  if (hivemindBlock) {
    sections.push("", hivemindBlock);
  }

  sections.push("", "Conversation:", normalized);
  return sections.join("\n");
}

function bridgeErrorPayload(err) {
  const stderr = err?.stderr ? String(err.stderr).trim().slice(-2000) : "";
  const message = String(err?.message || err);
  return {
    error: {
      message: stderr ? `${message}\n${stderr}` : message,
      type: "connection_error",
    },
  };
}

async function callKiro(prompt) {
  const startedAt = Date.now();

  const { stdout, stderr } = await execFileAsync(KIRO_PROVIDER, [prompt], {
    cwd: WORKSPACE,
    timeout: 240000,
    maxBuffer: 1024 * 1024 * 12,
    env: {
      ...process.env,
      AEGIS_WORKSPACE: WORKSPACE,
      AEGIS_REPO_PATH: WORKSPACE,
      FORCE_COLOR: "0",
      NO_COLOR: "1",
    },
  });

  const rawStdout = String(stdout || "");
  const rawStderr = String(stderr || "");

  console.log("[kiro-bridge] stdout chars:", rawStdout.length);
  console.log("[kiro-bridge] stderr chars:", rawStderr.length);
  console.log("[kiro-bridge] duration ms:", Date.now() - startedAt);

  if (rawStderr.trim()) {
    console.error("[kiro-bridge stderr]", rawStderr.slice(0, 2000));
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
      // Hermes may tolerate 0, but nonzero is safer for some clients.
      prompt_tokens: 1,
      completion_tokens: Math.max(1, String(content || "").split(/\s+/).length),
      total_tokens: Math.max(2, String(content || "").split(/\s+/).length + 1),
    },
  };
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function streamResponse({ res, id, model, content }) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Role chunk
  writeSse(res, {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: { role: "assistant" },
        finish_reason: null,
      },
    ],
  });

  const text = String(content || "No content.");

  // Send content in chunks. Some clients are happier with multiple deltas.
  const chunkSize = 800;
  for (let i = 0; i < text.length; i += chunkSize) {
    writeSse(res, {
      id,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: { content: text.slice(i, i + chunkSize) },
          finish_reason: null,
        },
      ],
    });
  }

  // Finish chunk
  writeSse(res, {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "stop",
      },
    ],
  });

  res.write("data: [DONE]\n\n");
  res.end();
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "kiro-current",
    workspace: WORKSPACE,
    kiroProvider: KIRO_PROVIDER,
  });
});

app.get("/health/ready", async (_req, res) => {
  if (process.env.KIRO_HEALTH_CHECK !== "1") {
    return res.json({ ok: true, kiro: "skipped" });
  }

  try {
    await execFileAsync("kiro-cli", ["--version"], {
      cwd: WORKSPACE,
      timeout: 15000,
      env: process.env,
    });
    return res.json({ ok: true, kiro: "ok" });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      kiro: String(err?.message || err),
    });
  }
});

app.get("/v1/models", (_req, res) => {
  res.json({
    object: "list",
    data: [
      {
        id: "kiro-current",
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "local-kiro",
      },
    ],
  });
});

app.post("/v1/chat/completions", async (req, res) => {
  const id = `chatcmpl_${Date.now()}`;

  try {
    const body = req.body || {};
    const {
      messages = [],
      model = "kiro-current",
      stream = false,
    } = body;

    console.log("[kiro-bridge] /v1/chat/completions", {
      stream,
      model,
      messageCount: Array.isArray(messages) ? messages.length : 0,
      hasTools: Boolean(body.tools),
      toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
    });

    const prompt = messagesToPrompt(messages);

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

    const output = await callKiro(prompt);

    if (stream) {
      return streamResponse({ res, id, model, content: output });
    }

    return res.json(nonStreamResponse({ id, model, content: output }));
  } catch (err) {
    console.error("[kiro-bridge error]", err);

    const errorPayload = bridgeErrorPayload(err);
    const status = err?.code === "ENOENT" || /ECONNREFUSED|timed out/i.test(String(err?.message))
      ? 502
      : 502;

    if (req.body?.stream) {
      res.status(status);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    return res.status(status).json(errorPayload);
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, "127.0.0.1", () => {
  console.log(`Kiro OpenAI-compatible bridge listening on http://127.0.0.1:${port}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`Kiro provider: ${KIRO_PROVIDER}`);
});
