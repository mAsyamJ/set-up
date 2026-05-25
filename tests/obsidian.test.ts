import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildFrontmatter } from "../integrations/obsidian/frontmatter.js";

describe("obsidian frontmatter", () => {
  it("wraps yaml frontmatter", () => {
    const out = buildFrontmatter({ type: "test", project: "demo" });
    assert.match(out, /^---\n/);
    assert.match(out, /type: test/);
    assert.match(out, /---\n$/);
  });
});
