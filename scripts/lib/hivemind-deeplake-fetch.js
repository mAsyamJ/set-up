#!/usr/bin/env node
/**
 * Fetch recent Hivemind summaries from Deeplake API (cloud index).
 * Used by kiro-openai-bridge when local ~/.deeplake/memory is empty.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MAX_ROWS = Number(process.env.HIVEMIND_BRIDGE_FETCH_LIMIT || 8);
const TIMEOUT_MS = Number(process.env.HIVEMIND_QUERY_TIMEOUT_MS || 12000);

function loadCredentials() {
  const credPath = path.join(os.homedir(), ".deeplake", "credentials.json");
  try {
    return JSON.parse(fs.readFileSync(credPath, "utf8"));
  } catch {
    return null;
  }
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

async function queryDeeplake(sql) {
  const creds = loadCredentials();
  if (!creds?.token) {
    return { error: "not_logged_in" };
  }
  const apiUrl = process.env.HIVEMIND_API_URL || creds.apiUrl || "https://api.deeplake.ai";
  const workspaceId = process.env.HIVEMIND_WORKSPACE_ID || creds.workspaceId || "default";
  const orgId = process.env.HIVEMIND_ORG_ID || creds.orgId;
  const url = `${apiUrl}/workspaces/${workspaceId}/tables/query`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
        "X-Activeloop-Org-Id": orgId,
        "X-Deeplake-Client": "hivemind",
      },
      signal: controller.signal,
      body: JSON.stringify({ query: sql }),
    });
    const text = await resp.text();
    if (!resp.ok) {
      return { error: `api_${resp.status}`, detail: text.slice(0, 200) };
    }
    const raw = JSON.parse(text);
    if (!raw?.rows || !raw?.columns) {
      return { rows: [] };
    }
    const rows = raw.rows.map((row) =>
      Object.fromEntries(raw.columns.map((col, i) => [col, row[i]]))
    );
    return { rows };
  } catch (e) {
    return { error: e.message || String(e) };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRecentSummaries() {
  const table = process.env.HIVEMIND_TABLE || "memory";
  const sql = `SELECT path, description, project, last_update_date, summary FROM "${table}" WHERE path LIKE '/summaries/%' ORDER BY last_update_date DESC LIMIT ${MAX_ROWS}`;
  return queryDeeplake(sql);
}

async function searchSummaries(keyword, limit = 5) {
  const table = process.env.HIVEMIND_TABLE || "memory";
  const q = sqlEscape(keyword);
  const sql = `SELECT path, description, summary FROM "${table}" WHERE path LIKE '/summaries/%' AND (summary ILIKE '%${q}%' OR description ILIKE '%${q}%') ORDER BY last_update_date DESC LIMIT ${limit}`;
  return queryDeeplake(sql);
}

function formatRowsForBridge(rows) {
  if (!rows?.length) return "";
  const lines = ["## Hivemind cloud index (recent sessions)"];
  for (const r of rows) {
    const p = r.path || "?";
    const desc = r.description || "";
    const proj = r.project || "";
    const date = r.last_update_date || "";
    const sum = String(r.summary || "").slice(0, 400);
    lines.push(`### ${p}`, `- ${date} | ${proj} | ${desc}`, sum ? sum : "(no summary body)", "");
  }
  return lines.join("\n").trim();
}

async function main() {
  const mode = process.argv[2] || "index";
  if (mode === "search" && process.argv[3]) {
    const result = await searchSummaries(process.argv[3]);
    if (result.error) {
      process.stderr.write(`hivemind-fetch error: ${result.error}\n`);
      process.exit(1);
    }
    process.stdout.write(formatRowsForBridge(result.rows));
    return;
  }
  const result = await fetchRecentSummaries();
  if (result.error) {
    process.stderr.write(`hivemind-fetch error: ${result.error} ${result.detail || ""}\n`);
    process.exit(1);
  }
  process.stdout.write(formatRowsForBridge(result.rows));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    process.stderr.write(String(e.message || e));
    process.exit(1);
  });
}

export { fetchRecentSummaries, searchSummaries, formatRowsForBridge, queryDeeplake };
