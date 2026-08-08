import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { resolveInProject } from "../core/policy/path-policy.js";
import { normalizeRepositoryPaths } from "../core/policy/repository-path-policy.js";
import { SafeFilesystem } from "../core/runtime/safe-fs.js";

function fixture(): { root: string; project: string; outside: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-path-"));
  const project = path.join(root, "project");
  const outside = path.join(root, "outside");
  fs.mkdirSync(project);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(project, "allowed.txt"), "before");
  fs.writeFileSync(path.join(outside, "secret.txt"), "outside");
  return { root, project, outside };
}

describe("filesystem confinement", () => {
  it("rejects traversal, sensitive paths, and current symlink escapes", () => {
    const { project, outside } = fixture();
    assert.throws(() => resolveInProject(project, "../outside/file"), /escapes/);
    assert.throws(() => resolveInProject(project, ".ssh/id_ed25519"), /secrets/);
    fs.symlinkSync(outside, path.join(project, "escape"));
    assert.throws(() => resolveInProject(project, "escape/file"), /symlink escapes/);
  });

  it("uses descriptor-anchored reads and writes", async () => {
    const { project, outside } = fixture();
    const broker = new SafeFilesystem(process.cwd(), project);
    assert.equal(await broker.read("allowed.txt"), "before");
    await assert.rejects(
      broker.read("../outside/secret.txt"),
      /invalid|normalized relative path/
    );
    await assert.rejects(
      broker.write({ path: "allowed.txt", content: "after" }),
      /overwrite is false/
    );
    await broker.write({ path: "allowed.txt", content: "after", overwrite: true });
    assert.equal(fs.readFileSync(path.join(project, "allowed.txt"), "utf8"), "after");
    assert.equal(fs.readFileSync(path.join(outside, "secret.txt"), "utf8"), "outside");
  });

  it("rejects final-component and parent symlinks", async () => {
    const { project, outside } = fixture();
    fs.symlinkSync(path.join(outside, "secret.txt"), path.join(project, "linked.txt"));
    fs.symlinkSync(outside, path.join(project, "linked-dir"));
    const broker = new SafeFilesystem(process.cwd(), project);
    await assert.rejects(broker.read("linked.txt"));
    await assert.rejects(
      broker.write({ path: "linked-dir/secret.txt", content: "changed", overwrite: true })
    );
    assert.equal(fs.readFileSync(path.join(outside, "secret.txt"), "utf8"), "outside");
  });

  it("rejects Git pathspec magic and sensitive repository paths", () => {
    assert.deepEqual(
      normalizeRepositoryPaths(["src/main.ts", "README.md", "src/main.ts"]),
      ["README.md", "src/main.ts"]
    );
    for (const candidate of [
      "../outside",
      "/absolute",
      ":(glob)**",
      ".git/config",
      ".env",
      "nested\\windows-path",
    ]) {
      assert.throws(() => normalizeRepositoryPaths([candidate]), /unsafe repository path/);
    }
  });
});
