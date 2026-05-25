import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankSource } from "../rag/policies/source-priority.js";

describe("source priority", () => {
  it("ranks task above repo", () => {
    assert.ok(rankSource("task") < rankSource("repo"));
  });

  it("ranks manifest above vault", () => {
    assert.ok(rankSource("manifest") < rankSource("obsidian"));
  });
});
