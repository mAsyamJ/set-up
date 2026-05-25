import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkToolAllowed } from "../tools/gateway/tool-gateway.js";

describe("tool policy", () => {
  it("denies unknown tools", () => {
    const r = checkToolAllowed("shell.run", { command: "pnpm test" });
    assert.equal(r.allowed, false);
  });

  it("allows R0 repo.read", () => {
    const r = checkToolAllowed("repo.read", { path: "README.md" });
    assert.equal(r.allowed, true);
  });

  it("denies .env reads (R5)", () => {
    const r = checkToolAllowed("repo.read", { path: ".env" });
    assert.equal(r.allowed, false);
  });

  it("denies forbidden patterns in args", () => {
    const r = checkToolAllowed("verify.run", { command: "rm -rf /" });
    assert.equal(r.allowed, false);
  });

  it("allows git.status", () => {
    const r = checkToolAllowed("git.status", {});
    assert.equal(r.allowed, true);
  });

  it("allows task.create (R1)", () => {
    const r = checkToolAllowed("task.create", { title: "Test task" });
    assert.equal(r.allowed, true);
  });

  it("allows rag.search (R0)", () => {
    const r = checkToolAllowed("rag.search", { query: "manifest" });
    assert.equal(r.allowed, true);
  });
});
