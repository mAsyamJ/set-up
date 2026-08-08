import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { getToolPolicy } from "../core/policy/tool-policy.js";

describe("MCP profiles", () => {
  it("keeps approval response out of every profile", () => {
    for (const profile of Object.values(getToolPolicy().profiles)) {
      assert.equal(profile.allowedTools.includes("approval.respond"), false);
    }
  });

  it("uses fixed entrypoints and no request actorId schema", () => {
    const source = fs.readFileSync(
      "runtime/mcp/harness-mcp-server/src/server-factory.ts",
      "utf8"
    );
    assert.doesNotMatch(source, /actorId/);
    assert.doesNotMatch(source, /harness_switch_project/);
    assert.doesNotMatch(source, /server\.(?:prompt|resource)\(/);
    for (const entrypoint of ["cursor", "hermes-operator", "hermes-worker"]) {
      assert.equal(
        fs.existsSync(
          `runtime/mcp/harness-mcp-server/src/entrypoints/${entrypoint}.ts`
        ),
        true
      );
    }
  });

  it("passes worker capabilities explicitly and limits Hermes to Harness MCP", () => {
    const setup = fs.readFileSync("scripts/configure-hermes-harness-profiles.sh", "utf8");
    const supervisor = fs.readFileSync("core/runtime/worker-supervisor.ts", "utf8");
    for (const variable of [
      "HARNESS_WORKER_ID",
      "HARNESS_WORKER_PROJECT_ID",
      "HARNESS_WORKER_WORKTREE",
      "HARNESS_WORKER_LEASE_TOKEN",
    ]) {
      assert.equal(setup.includes(`'${variable}=\${${variable}}'`), true);
    }
    assert.match(supervisor, /"mcp-harness"/);
    assert.doesNotMatch(supervisor, /--yolo|--accept-hooks/);
  });
});
