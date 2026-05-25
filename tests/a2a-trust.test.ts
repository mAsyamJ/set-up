import { describe, it } from "node:test";
import assert from "node:assert/strict";

function redactForRemote(content: string): string {
  return content
    .replace(/\.env[^\n]*/g, "[REDACTED]")
    .replace(/sk-[a-zA-Z0-9]+/g, "[REDACTED]")
    .slice(0, 4000);
}

describe("a2a trust policy", () => {
  it("redacts env lines for remote trust", () => {
    const out = redactForRemote("line\n.env SECRET=1\nok");
    assert.doesNotMatch(out, /SECRET=1/);
    assert.match(out, /\[REDACTED\]/);
  });
});
