#!/usr/bin/env node
/**
 * Persisted default model for Hermes multi-provider bridge.
 */
const fs = require("node:fs");
const path = require("node:path");

const WORKSPACE =
  process.env.AEGIS_WORKSPACE ||
  process.env.AEGIS_REPO_PATH ||
  path.resolve(__dirname, "../..");

const STATE_PATH =
  process.env.AEGIS_MODEL_STATE ||
  path.join(WORKSPACE, "runtime/aegis-model.json");

const KNOWN_MODELS = ["kiro-current", "cursor-composer-2"];
const DEFAULT_MODEL = process.env.AEGIS_DEFAULT_MODEL || "kiro-current";

function ensureStateDir() {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
}

function readState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.defaultModel && KNOWN_MODELS.includes(parsed.defaultModel)) {
      return parsed;
    }
  } catch {
    // fall through to default
  }
  return {
    defaultModel: KNOWN_MODELS.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : "kiro-current",
    updatedAt: null,
    updatedBy: "default",
  };
}

function getDefaultModel() {
  return readState().defaultModel;
}

function setDefaultModel(model, updatedBy = "admin") {
  if (!KNOWN_MODELS.includes(model)) {
    throw new Error(`Unknown provider model: ${model}`);
  }
  ensureStateDir();
  const next = {
    defaultModel: model,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function listProviders() {
  return KNOWN_MODELS.slice();
}

function isCursorConfigured() {
  if (Boolean(process.env.CURSOR_API_KEY?.trim())) {
    return true;
  }
  try {
    const { execFileSync } = require("node:child_process");
    const agentBin = process.env.CURSOR_AGENT_BIN || "agent";
    const out = execFileSync(agentBin, ["status"], {
      encoding: "utf8",
      timeout: 10000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return !/not logged in/i.test(String(out));
  } catch {
    return false;
  }
}

const CURSOR_NOT_CONFIGURED_MESSAGE =
  "Cursor is not configured. Run scripts/setup-cursor-bridge-auth.sh (agent login) or set CURSOR_API_KEY in ~/.hermes/.env, then restart kiro-openai-bridge.";

function getCursorBridgeMode() {
  const raw = String(process.env.CURSOR_BRIDGE_MODE || "agent").trim().toLowerCase();
  return ["agent", "ask", "plan"].includes(raw) ? raw : "agent";
}

module.exports = {
  STATE_PATH,
  KNOWN_MODELS,
  getDefaultModel,
  setDefaultModel,
  listProviders,
  isCursorConfigured,
  readState,
  CURSOR_NOT_CONFIGURED_MESSAGE,
  getCursorBridgeMode,
};
