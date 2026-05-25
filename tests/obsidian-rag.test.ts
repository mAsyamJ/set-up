import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveVaultPath } from "../integrations/obsidian/vault-config.js";

describe("obsidian RAG vault path", () => {
  it("resolves tilde vault path to home directory", () => {
    const home = process.env.HOME ?? "/tmp";
    const cfg = {
      enabled: true,
      vaultPath: "~/dev/Project/_vaults/agentic-engineering",
      projectNotePath: "01-Projects/demo/_index.md",
      projectSlug: "demo",
      projectDisplayName: "Demo",
    };
    const resolved = resolveVaultPath("/tmp/some-project", cfg);
    assert.equal(resolved, `${home}/dev/Project/_vaults/agentic-engineering`);
  });
});
