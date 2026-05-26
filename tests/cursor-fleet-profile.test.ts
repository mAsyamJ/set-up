import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { modeForProfile, verifyPromptSuffix } from "../runtime/cursor-fleet/src/profile-modes.js";

describe("cursor-fleet profile-modes", () => {
  it("maps builder to agent", () => {
    assert.equal(modeForProfile("aegis-builder"), "agent");
  });

  it("maps security to ask", () => {
    assert.equal(modeForProfile("aegis-security"), "ask");
  });

  it("maps orchestrator to plan", () => {
    assert.equal(modeForProfile("aegis-orchestrator"), "plan");
  });

  it("adds qa verify suffix", () => {
    assert.match(verifyPromptSuffix("aegis-qa"), /verification/i);
  });
});
