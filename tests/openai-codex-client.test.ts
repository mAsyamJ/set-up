import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { classifyError } = require("../scripts/lib/openai-codex-client.cjs");

describe("openai codex error classification", () => {
  it("treats insufficient quota as a permanent billing failure", () => {
    const info = classifyError(429, new Headers(), {
      error: {
        type: "insufficient_quota",
        code: "insufficient_quota",
        message: "quota exhausted",
      },
    });
    assert.equal(info.category, "billing");
    assert.equal(info.retryable, false);
  });

  it("keeps ordinary 429 rate limits retryable", () => {
    const info = classifyError(429, new Headers(), {
      error: {
        type: "rate_limit_error",
        code: "rate_limit_exceeded",
        message: "slow down",
      },
    });
    assert.equal(info.category, "retryable");
    assert.equal(info.retryable, true);
  });
});
