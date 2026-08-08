import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactedJson, redactText } from "../core/security/redaction.js";

describe("audit redaction", () => {
  it("redacts sensitive object fields", () => {
    const output = redactedJson({
      authorization: "Bearer do-not-log",
      nested: { provider_token: "do-not-log" },
      safe: "visible"
    });
    assert.doesNotMatch(output, /do-not-log/);
    assert.match(output, /visible/);
  });

  it("redacts common token, environment, URL, and key material", () => {
    const input = [
      "sk-abcdefghijklmnop",
      "AKIAIOSFODNN7EXAMPLE",
      "npm_abcdefghijklmnopqrstuvwxyz",
      "glpat-abcdefghijklmnopqrstuvwxyz",
      "xoxb-123456789012-abcdefghijklmnop",
      "AIzaSyD-example-example-example-example",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signaturevalue",
      "API_SECRET=do-not-log",
      "https://user:password@example.test",
      "-----BEGIN PRIVATE KEY-----\ndo-not-log\n-----END PRIVATE KEY-----"
    ].join("\n");
    const output = redactText(input);
    assert.doesNotMatch(
      output,
      /do-not-log|password@example|AKIAIOSFODNN7EXAMPLE|npm_|glpat-|xoxb-|AIza|eyJhbGci/
    );
  });
});
