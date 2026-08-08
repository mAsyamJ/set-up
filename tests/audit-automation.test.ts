import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaultConfig, writeConfig, readConfig } from "../runtime/audit-automation/config.js";
import { generateAuditReport } from "../runtime/audit-automation/report.js";
import { shouldRetryProviderError } from "../runtime/audit-automation/runner.js";
import type { AuditRunState } from "../runtime/audit-automation/state.js";

describe("audit automation", () => {
  it("builds midnight-audit defaults", () => {
    const cfg = defaultConfig("/tmp/midnight-audit");
    assert.equal(cfg.projectSlug, "midnight-audit");
    assert.equal(cfg.provider, "openai-codex");
    assert.match(cfg.paths.agentRole, /audits\/asyam\/\.AGENTROLE\.md$/);
    assert.match(cfg.paths.findings, /audits\/asyam\/findings\/findings\.md$/);
  });

  it("round-trips config and generates fallback report", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "audit-auto-"));
    const root = path.join(base, "midnight-audit");
    fs.mkdirSync(root, { recursive: true });
    fs.mkdirSync(path.join(root, ".harness", "tasks", "backlog"), { recursive: true });
    fs.writeFileSync(path.join(root, ".harness", "tasks", "backlog", "README.md"), "# backlog\n", "utf8");
    fs.mkdirSync(path.join(root, "audits", "asyam", "findings"), { recursive: true });
    fs.mkdirSync(path.join(root, "audits", "asyam", "candidates"), { recursive: true });
    fs.mkdirSync(path.join(root, "audits", "asyam", "workflow"), { recursive: true });
    fs.writeFileSync(path.join(root, "audits", "asyam", ".AGENTROLE.md"), "# role\n", "utf8");
    fs.writeFileSync(
      path.join(root, "audits", "asyam", "findings", "findings.md"),
      "## L-01: Sample\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(root, "audits", "asyam", "candidates", "CANDIDATES.md"),
      "**Status:** proven\n**Status:** disproven\n",
      "utf8"
    );
    fs.writeFileSync(path.join(root, "audits", "asyam", "workflow", "POC_RESULTS.md"), "Result: pass\n", "utf8");
    fs.writeFileSync(path.join(root, "audits", "asyam", "workflow", "03_DEDUP_MAP.md"), "Date: 2026-06-01\n", "utf8");

    const cfg = defaultConfig(root);
    writeConfig(root, cfg);
    assert.equal(readConfig(root).provider, "openai-codex");

    const state: AuditRunState = {
      runId: "midnight-audit-test",
      status: "waiting_rate_limit",
      provider: "openai-codex",
      model: "gpt-5.1-codex-max",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responseId: "resp_123",
      nextAttemptAt: new Date(Date.now() + 60_000).toISOString(),
      retryReason: "rate limit",
      notePath: null,
      summary: "waiting",
    };
    const report = await generateAuditReport(root, cfg, state);
    assert.match(report.markdown, /Provider: openai-codex/);
    assert.match(report.markdown, /Validated findings: 1/);
    assert.ok(fs.existsSync(report.mdPath));
    assert.ok(fs.existsSync(report.jsonPath));
  });

  it("does not retry permanent OpenAI billing failures", () => {
    assert.equal(
      shouldRetryProviderError({ openai: { retryable: false, category: "billing" } }),
      false
    );
    assert.equal(
      shouldRetryProviderError({ openai: { retryable: true, category: "retryable" } }),
      true
    );
  });
});
