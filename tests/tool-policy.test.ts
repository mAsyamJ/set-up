import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fixedPrincipal, humanPrincipal, workerPrincipal } from "../core/auth/principal.js";
import { checkToolAllowed, getToolPolicy } from "../core/policy/tool-policy.js";

describe("tool policy", () => {
  it("denies unknown tools and unknown profiles", () => {
    assert.equal(checkToolAllowed("unknown", {}, fixedPrincipal("audit")).allowed, false);
    assert.equal(
      checkToolAllowed(
        "repo.read",
        {},
        { ...fixedPrincipal("audit"), profile: "spoofed" } as never
      ).allowed,
      false
    );
  });

  it("allows only explicit profile tools even though every default is deny", () => {
    const policy = getToolPolicy();
    assert.equal(Object.values(policy.tools).every((tool) => tool.default === "deny"), true);
    assert.equal(
      checkToolAllowed("repo.read", { path: "README.md" }, fixedPrincipal("cursor")).allowed,
      true
    );
    assert.equal(
      checkToolAllowed("workspace.write", {}, fixedPrincipal("cursor")).allowed,
      false
    );
  });

  it("denies sensitive reads and forbidden patterns", () => {
    assert.equal(
      checkToolAllowed("repo.read", { path: ".env.local" }, fixedPrincipal("audit")).allowed,
      false
    );
    assert.equal(
      checkToolAllowed(
        "action.propose",
        { arguments: { content: "rm -rf /" } },
        workerPrincipal("test")
      ).allowed,
      false
    );
  });

  it("never exposes approval response, push, merge, or deploy", () => {
    const principals = [
      fixedPrincipal("audit"),
      fixedPrincipal("cursor"),
      fixedPrincipal("hermes-operator"),
      workerPrincipal("test"),
      humanPrincipal("operator"),
    ];
    for (const principal of principals) {
      for (const tool of ["approval.respond", "github.push", "git.merge", "deploy.run"]) {
        assert.equal(checkToolAllowed(tool, {}, principal).allowed, false);
      }
    }
  });

  it("keeps Hermes operator read-only except bounded task submission", () => {
    const hermes = fixedPrincipal("hermes-operator");
    assert.equal(checkToolAllowed("task.submit", {}, hermes).allowed, true);
    assert.equal(checkToolAllowed("repo.read", {}, hermes).allowed, false);
    assert.equal(checkToolAllowed("verify.run", {}, hermes).allowed, false);
    assert.equal(checkToolAllowed("workspace.write", {}, hermes).allowed, false);
  });
});
