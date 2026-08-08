import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Agent Harness safety skeleton", () => {
  it("has no installable legacy user units", () => {
    assert.equal(fs.existsSync(path.join(root, "systemd/user/hermes-gateway.service")), false);
    assert.equal(fs.existsSync(path.join(root, "systemd/user/kiro-openai-bridge.service")), false);
    assert.equal(fs.existsSync(path.join(root, "systemd/user/cursor-fleet.service")), false);
    assert.ok(
      fs.existsSync(path.join(root, "templates/systemd/hermes-harness-operator.service.in"))
    );
  });

  it("has trusted policy, gateway, and approval authority", () => {
    assert.ok(fs.existsSync(path.join(root, "tools/policies/default.tool-policy.json")));
    assert.ok(fs.existsSync(path.join(root, "tools/policies/command-catalog.json")));
    assert.ok(fs.existsSync(path.join(root, "tools/gateway/tool-gateway.ts")));
    assert.ok(fs.existsSync(path.join(root, "core/approvals/approval-service.ts")));
    assert.ok(fs.existsSync(path.join(root, "core/auth/principal.ts")));
  });

  it("has separate fixed-principal MCP entrypoints", () => {
    for (const entrypoint of ["cursor.ts", "hermes-operator.ts", "hermes-worker.ts"]) {
      assert.ok(
        fs.existsSync(
          path.join(root, "runtime/mcp/harness-mcp-server/src/entrypoints", entrypoint)
        )
      );
    }
  });

  it("keeps the advisory agent registry read-only", () => {
    const registry = JSON.parse(
      fs.readFileSync(path.join(root, "agents/registry.json"), "utf8")
    ) as {
      advisoryOnly?: boolean;
      securityAuthority?: string;
      agents?: Record<string, { allowedTools?: string[] }>;
    };
    assert.equal(registry.advisoryOnly, true);
    assert.equal(registry.securityAuthority, "tools/policies/default.tool-policy.json");
    for (const agent of Object.values(registry.agents ?? {})) {
      assert.equal(
        agent.allowedTools?.some((tool) =>
          ["workspace.write", "verify.run", "worktree.commit", "task.review"].includes(tool)
        ),
        false
      );
    }
  });

  it("keeps legacy automation entrypoints disabled", () => {
    for (const script of [
      "scripts/install-systemd-user.sh",
      "scripts/install-cursor-fleet-systemd.sh",
      "scripts/aegis-kanban-dispatch-once.sh",
      "scripts/aegis-pm-orchestrate-once.sh",
      "scripts/aegis-d3-deploy-once.sh",
      "scripts/aegis-kanban-seed-fleet-wave.sh",
      "scripts/aegis-model.sh",
      "scripts/import-external-project.sh",
      "scripts/providers/codex-provider.sh",
      "scripts/providers/kiro-provider.sh",
      "scripts/smoke-cursor-bridge.sh",
      "scripts/setup-shell.sh",
      "cli/commands/sync-hermes.sh",
      "cli/commands/cursor-fleet.sh",
    ]) {
      const source = fs.readFileSync(path.join(root, script), "utf8");
      assert.match(source, /disabled|quarantined/);
      assert.match(source, /exit 2/);
    }
  });

  it("keeps legacy bridge and Python entrypoints disabled", () => {
    for (const entrypoint of [
      "scripts/aegis-kanban-viewer.py",
      "scripts/merge-hermes-harness-mcp.py",
      "scripts/merge-hermes-kanban-fleet.py",
      "scripts/write-harness-active-context.py",
      "scripts/providers/cursor-provider.mjs",
      "scripts/refuse-a2a.mjs",
      "tools/kiro-openai-bridge/server.js",
      "tools/real-hermes-mcp/refuse.mjs",
    ]) {
      const source = fs.readFileSync(path.join(root, entrypoint), "utf8");
      assert.match(source, /disabled/);
      assert.match(source, /(?:SystemExit|process\.exit)\(2\)/);
    }
  });
});
