#!/usr/bin/env node
/**
 * Resolve active harness project root from active-project.env (same as Harness MCP).
 */
const fs = require("node:fs");
const path = require("node:path");

function parseEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
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

function resolveActiveWorkspace(harnessRoot, fallback) {
  const stateHome =
    process.env.HARNESS_STATE_HOME ||
    path.join(
      process.env.XDG_STATE_HOME || path.join(process.env.HOME || "", ".local", "state"),
      "agent-harness"
    );
  const envPath = process.env.HARNESS_ACTIVE_PROJECT_ENV || path.join(stateHome, "active-project.env");
  const active = parseEnvFile(envPath);
  const candidate = active.AEGIS_WORKSPACE || active.AEGIS_RPC_ROOT;
  if (candidate) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) return resolved;
  }
  const fromEnv = process.env.AEGIS_WORKSPACE || process.env.AEGIS_REPO_PATH;
  if (fromEnv) {
    const resolved = path.resolve(fromEnv);
    if (fs.existsSync(resolved)) return resolved;
  }
  if (fallback) return path.resolve(fallback);
  throw new Error("No active workspace; set AEGIS_WORKSPACE or use switch-project");
}

module.exports = { parseEnvFile, resolveActiveWorkspace };
