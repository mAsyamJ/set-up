import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { assertDiskHeadroom } from "../core/runtime/disk-policy.js";
import { loadManifest } from "../tools/gateway/tool-gateway.js";
import commandCatalog from "../tools/policies/command-catalog.json" with { type: "json" };

describe("structured verification", () => {
  it("rejects legacy manifest shell strings", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "harness-command-"));
    fs.mkdirSync(path.join(project, ".harness"));
    fs.writeFileSync(
      path.join(project, ".harness/project.manifest.json"),
      JSON.stringify({ commands: { test: "touch SHOULD_NOT_EXIST" } })
    );
    assert.throws(() => loadManifest(project), /shell commands are unsupported/);
    assert.equal(fs.existsSync(path.join(project, "SHOULD_NOT_EXIST")), false);
  });

  it("contains only structured, network-denied command specifications", () => {
    for (const [id, command] of Object.entries(commandCatalog)) {
      assert.match(id, /^[a-z0-9.-]+$/);
      assert.match(command.file, /^[a-zA-Z0-9._+-]+$/);
      assert.equal(command.cwdPolicy, "worktree");
      assert.equal(command.network, "deny");
      assert.equal(Array.isArray(command.args), true);
      assert.equal(command.args.some((arg) => /[;&|`$]/.test(arg)), false);
    }
  });

  it("fails closed when required disk headroom is unavailable", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "harness-disk-"));
    assert.throws(
      () => assertDiskHeadroom(directory, Number.MAX_SAFE_INTEGER),
      /insufficient disk headroom/
    );
  });
});
