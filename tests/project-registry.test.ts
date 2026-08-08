import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  getRegisteredProject,
  loadProjectRegistry,
  safeProjectSummaries,
} from "../core/projects/registry.js";

describe("local project registry", () => {
  it("loads v2 entries and omits paths from safe summaries", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-registry-"));
    const project = path.join(root, "project");
    fs.mkdirSync(project);
    fs.mkdirSync(path.join(project, ".git"));
    const registry = path.join(root, "projects.json");
    fs.writeFileSync(
      registry,
      JSON.stringify({
        schema: "agent-harness.projects.v2",
        pathBase: "registry",
        projects: {
          canary: {
            id: "00000000-0000-4000-8000-000000000001",
            path: project,
            displayName: "Canary",
            provenance: "disposable-canary",
            executionPolicy: "canary-worker",
          },
        },
      })
    );
    assert.equal(loadProjectRegistry(registry)[0].available, true);
    assert.equal(getRegisteredProject("canary", registry).canonicalPath, fs.realpathSync(project));
    assert.equal("canonicalPath" in safeProjectSummaries(registry)[0], false);
    assert.equal("path" in safeProjectSummaries(registry)[0], false);
  });

  it("fails closed on unknown schema", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-registry-invalid-"));
    const registry = path.join(root, "projects.json");
    fs.writeFileSync(registry, JSON.stringify({ schema: "unknown", projects: {} }));
    assert.throws(() => loadProjectRegistry(registry));
  });
});
