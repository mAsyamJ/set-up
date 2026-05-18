#!/usr/bin/env node
/**
 * Hivemind context for kiro-openai-bridge: local files + Deeplake cloud index.
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const MAX_CHARS = Number(process.env.HIVEMIND_BRIDGE_CONTEXT_MAX || 4500);
const FETCH_CLOUD = process.env.HIVEMIND_BRIDGE_FETCH_CLOUD !== "0";
const CACHE_TTL_MS = Number(process.env.HIVEMIND_BRIDGE_CACHE_MS || 120000);
const MEMORY_ROOT =
  process.env.HIVEMIND_MEMORY_PATH || path.join(os.homedir(), ".deeplake", "memory");

const REPO_ROOT =
  process.env.AEGIS_WORKSPACE ||
  process.env.AEGIS_REPO_PATH ||
  path.resolve(__dirname, "../..");

let cloudCache = { at: 0, text: "" };

function readSafe(filePath, maxBytes = 12000) {
  try {
    const st = fs.statSync(filePath);
    if (!st.isFile()) return "";
    return fs.readFileSync(filePath).slice(0, maxBytes).toString("utf8").trim();
  } catch {
    return "";
  }
}

function listRecentSummaries(dir, limit = 5) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit)
      .map((x) => x.name);
  } catch {
    return [];
  }
}

function fetchCloudIndex() {
  const now = Date.now();
  if (cloudCache.text && now - cloudCache.at < CACHE_TTL_MS) {
    return cloudCache.text;
  }
  const fetchScript = path.join(REPO_ROOT, "scripts/lib/hivemind-deeplake-fetch.js");
  if (!fs.existsSync(fetchScript)) return "";

  try {
    const out = execFileSync(process.execPath, [fetchScript], {
      encoding: "utf8",
      timeout: 15000,
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    cloudCache = { at: now, text: out.trim() };
    return cloudCache.text;
  } catch (e) {
    const err = e.stderr ? String(e.stderr).trim() : e.message;
    return `## Hivemind cloud fetch failed\n${err.slice(0, 300)}`;
  }
}

function buildSnippet() {
  const parts = [
    "HIVEMIND SHARED MEMORY (org-wide across Cursor, Hermes, Codex; Kiro via MCP):",
    "- Memory IS shared via Hivemind (Deeplake org). Say YES when asked if Kiro/Cursor/Hermes share memory.",
    "- Do NOT claim each runtime is fully isolated without checking Hivemind first.",
    "- Kiro IDE: use hivemind_search MCP. Telegram (this path): uses the index below.",
    "",
  ];

  const index = readSafe(path.join(MEMORY_ROOT, "index.md"));
  if (index) {
    parts.push("## Local Hivemind index", index.slice(0, 1200), "");
  }

  const recent = listRecentSummaries(path.join(MEMORY_ROOT, "summaries"), 3);
  if (recent.length) {
    parts.push("## Local recent summaries");
    for (const name of recent) {
      const body = readSafe(path.join(MEMORY_ROOT, "summaries", name), 600);
      parts.push(`### ${name}`, body || "(empty)", "");
    }
  }

  if (FETCH_CLOUD) {
    const cloud = fetchCloudIndex();
    if (cloud) parts.push(cloud);
  }

  const text = parts.join("\n").trim();
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n…(truncated)`;
}

if (require.main === module) {
  process.stdout.write(buildSnippet());
}

module.exports = { buildSnippet, MEMORY_ROOT, fetchCloudIndex };
