import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("harness skeleton", () => {
  it("has systemd bridge and dispatch units", () => {
    assert.ok(fs.existsSync(path.join(root, "systemd/user/kiro-openai-bridge.service")));
    assert.ok(fs.existsSync(path.join(root, "systemd/user/aegis-kanban-dispatch.service")));
    assert.ok(fs.existsSync(path.join(root, "systemd/user/cursor-fleet.service")));
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
    assert.ok(fs.existsSync(path.join(root, "runtime/cursor-fleet/src/fleet-manager.ts")));
    assert.ok(fs.existsSync(path.join(root, "scripts/lib/worktree-pool.sh")));
  });

  it("includes codex provider and audit runtime", async () => {
    const modelState = await import(pathToFileURL(path.join(root, "scripts/lib/aegis-model-state.cjs")).href);
    const knownModels = modelState.KNOWN_MODELS || modelState.default?.KNOWN_MODELS || [];
    assert.ok(knownModels.includes("openai-codex"));
    assert.ok(fs.existsSync(path.join(root, "runtime/audit-automation/cli.ts")));
    const provider = fs.readFileSync(path.join(root, "scripts/providers/codex-provider.sh"), "utf8");
    assert.match(provider, /\.foundry\/bin/);
    assert.match(provider, /OPENAI_CODEX_SANDBOX_MODE:-workspace-write/);
    assert.match(provider, /--sandbox "\$SANDBOX_MODE"/);
    assert.match(provider, /shell_environment_policy\.inherit=all/);
    assert.match(provider, /shell_environment_policy\.set\.PATH/);
    const bridge = fs.readFileSync(path.join(root, "tools/kiro-openai-bridge/server.js"), "utf8");
    assert.match(bridge, /CURRENT USER REQUEST \(execute this now;/);
    assert.match(bridge, /Reference-only memory context/);
    assert.match(bridge, /usage limit\|insufficient quota\|rate limit/);
  });
});
