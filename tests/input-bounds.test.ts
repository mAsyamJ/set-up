import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createActionRecord } from "../core/actions/action-record.js";
import { assertBoundedJson } from "../core/security/bounded-json.js";

describe("bounded structured inputs", () => {
  it("accepts a small JSON object", () => {
    assert.doesNotThrow(() =>
      assertBoundedJson({ paths: ["src/main.ts"], flags: { verify: true } }, "input")
    );
  });

  it("rejects excessive size, depth, nodes, and non-JSON values", () => {
    assert.throws(
      () => assertBoundedJson({ value: "x".repeat(20_000) }, "input"),
      /oversized string/
    );
    let nested: unknown = "leaf";
    for (let index = 0; index < 10; index += 1) nested = { nested };
    assert.throws(() => assertBoundedJson(nested, "input"), /depth limit/);
    assert.throws(
      () =>
        assertBoundedJson(
          Array.from({ length: 2_100 }, (_, index) => index),
          "input"
        ),
      /node limit/
    );
    assert.throws(() => assertBoundedJson({ invalid: undefined }, "input"), /non-JSON/);
  });

  it("enforces bounds before creating an approvable action", () => {
    assert.throws(
      () =>
        createActionRecord({
          principalId: "worker:canary",
          taskId: "task_1",
          projectId: "canary",
          workspacePath: "/tmp/canary",
          toolId: "workspace.write",
          arguments: { content: "x".repeat(1_000_001) },
          risk: "R3",
          policyVersion: "test",
        }),
      /oversized string/
    );
  });
});
