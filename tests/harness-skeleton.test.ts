import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("harness skeleton", () => {
  it("has systemd bridge and dispatch units", () => {
    assert.ok(fs.existsSync(path.join(root, "systemd/user/kiro-openai-bridge.service")));
    assert.ok(fs.existsSync(path.join(root, "systemd/user/aegis-kanban-dispatch.service")));
  });

  it("has tool policy and gateway", () => {
    assert.ok(fs.existsSync(path.join(root, "tools/policies/default.tool-policy.json")));
    assert.ok(fs.existsSync(path.join(root, "tools/gateway/tool-gateway.ts")));
  });

  it("has harness MCP server", () => {
    assert.ok(fs.existsSync(path.join(root, "runtime/mcp/harness-mcp-server/src/server.ts")));
  });

  it("has agent registry", () => {
    const reg = JSON.parse(fs.readFileSync(path.join(root, "agents/registry.json"), "utf8"));
    assert.ok(reg.agents?.orchestrator);
  });

  it("has hermes harness OS skills and merge script", () => {
    assert.ok(fs.existsSync(path.join(root, "runtime/hermes/skill-agent-harness-os/SKILL.md")));
    assert.ok(fs.existsSync(path.join(root, "scripts/merge-hermes-harness-mcp.py")));
    assert.ok(fs.existsSync(path.join(root, "cli/commands/sync-hermes.sh")));
  });
});
