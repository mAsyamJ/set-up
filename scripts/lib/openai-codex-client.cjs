const fs = require("node:fs");
const path = require("node:path");

function readHermesDotEnv() {
  const envPath = path.join(process.env.HOME || "", ".hermes/.env");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function envValue(name, fallback = "") {
  if (process.env[name]?.trim()) return process.env[name].trim();
  const hermesEnv = readHermesDotEnv();
  return String(hermesEnv[name] || fallback).trim();
}

function getConfig() {
  return {
    apiKey: envValue("OPENAI_API_KEY"),
    baseUrl: envValue("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    interactiveModel: envValue("OPENAI_CODEX_MODEL_INTERACTIVE", "gpt-5.1-codex"),
    auditModel: envValue("OPENAI_CODEX_MODEL_AUDIT", "gpt-5.1-codex-max"),
    interactiveReasoningEffort: envValue(
      "OPENAI_CODEX_REASONING_EFFORT_INTERACTIVE",
      ""
    ),
    auditReasoningEffort: envValue("OPENAI_CODEX_REASONING_EFFORT_AUDIT", ""),
    reasoningEffort: envValue("OPENAI_CODEX_REASONING_EFFORT", "medium"),
    retryMaxDelaySec: Number(envValue("AEGIS_AUDIT_RETRY_MAX_DELAY_SEC", "21600")) || 21600,
  };
}

function isConfigured() {
  return Boolean(getConfig().apiKey);
}

function resolveModel(kind = "interactive") {
  const cfg = getConfig();
  return kind === "audit" ? cfg.auditModel : cfg.interactiveModel;
}

function resolveReasoningEffort(kind = "interactive") {
  const cfg = getConfig();
  if (kind === "audit") {
    return cfg.auditReasoningEffort || cfg.reasoningEffort;
  }
  return cfg.interactiveReasoningEffort || cfg.reasoningEffort;
}

function parseRetryAfterMs(headers) {
  const retryAfter = headers.get("retry-after");
  if (retryAfter) {
    const numeric = Number(retryAfter);
    if (Number.isFinite(numeric) && numeric > 0) return numeric * 1000;
    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  }

  for (const name of [
    "x-ratelimit-reset-requests",
    "x-ratelimit-reset-tokens",
    "x-ratelimit-reset",
  ]) {
    const raw = headers.get(name);
    if (!raw) continue;
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 0) {
      // Most gateways expose either epoch seconds or relative seconds. Support both.
      if (numeric > 1_000_000_000) {
        return Math.max(0, numeric * 1000 - Date.now());
      }
      return numeric * 1000;
    }
    const dateMs = Date.parse(raw);
    if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  }

  return null;
}

function extractOutputText(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks = [];
  for (const item of payload.output || []) {
    if (!item) continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      } else if (content?.type === "text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

function classifyError(status, headers, payload) {
  const retryMs = parseRetryAfterMs(headers);
  const message =
    payload?.error?.message ||
    payload?.message ||
    `OpenAI request failed with status ${status}`;
  const type = payload?.error?.type || "openai_error";
  const code = payload?.error?.code || null;
  const isPermanentQuotaFailure =
    type === "insufficient_quota" || code === "insufficient_quota";
  const retryable =
    (!isPermanentQuotaFailure && status === 429) ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504;
  const category =
    status === 401 || status === 403
      ? "auth"
      : isPermanentQuotaFailure
        ? "billing"
      : retryable
        ? "retryable"
        : "fatal";
  return {
    status,
    type,
    code,
    message,
    category,
    retryable,
    retryMs,
    retryAt:
      retryMs != null
        ? new Date(Date.now() + retryMs).toISOString()
        : null,
    raw: payload,
  };
}

async function requestResponses(payload) {
  const cfg = getConfig();
  if (!cfg.apiKey) {
    const err = new Error("OpenAI Codex is not configured. Set OPENAI_API_KEY in ~/.hermes/.env.");
    err.openai = { category: "auth", message: err.message, retryable: false };
    throw err;
  }

  const response = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const info = classifyError(response.status, response.headers, data);
    const err = new Error(info.message);
    err.openai = info;
    throw err;
  }

  return data;
}

async function createResponse({
  prompt,
  model,
  background = false,
  metadata = undefined,
  kind = "interactive",
  reasoningEffort = undefined,
}) {
  const cfg = getConfig();
  const payload = {
    model: model || cfg.interactiveModel,
    input: prompt,
    background,
  };
  const effort = reasoningEffort || resolveReasoningEffort(kind);
  if (effort) {
    payload.reasoning = { effort };
  }
  if (metadata && typeof metadata === "object") {
    payload.metadata = metadata;
  }
  const data = await requestResponses(payload);
  return {
    id: data.id || null,
    status: data.status || "completed",
    outputText: extractOutputText(data),
    response: data,
  };
}

async function pollResponse(responseId) {
  const cfg = getConfig();
  if (!cfg.apiKey) {
    const err = new Error("OpenAI Codex is not configured. Set OPENAI_API_KEY in ~/.hermes/.env.");
    err.openai = { category: "auth", message: err.message, retryable: false };
    throw err;
  }
  const response = await fetch(
    `${cfg.baseUrl.replace(/\/$/, "")}/responses/${encodeURIComponent(responseId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
      },
    }
  );
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!response.ok) {
    const info = classifyError(response.status, response.headers, data);
    const err = new Error(info.message);
    err.openai = info;
    throw err;
  }
  return {
    id: data.id || responseId,
    status: data.status || "completed",
    outputText: extractOutputText(data),
    response: data,
  };
}

module.exports = {
  getConfig,
  isConfigured,
  resolveModel,
  resolveReasoningEffort,
  createResponse,
  pollResponse,
  extractOutputText,
  classifyError,
};
