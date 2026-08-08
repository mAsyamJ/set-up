import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { actionDigest, createActionRecord } from "../core/actions/action-record.js";
import { ApprovalService } from "../core/approvals/approval-service.js";
import {
  initializeOperator,
  verifyOperatorPassphrase,
} from "../core/approvals/operator-auth.js";
import { humanPrincipal, workerPrincipal } from "../core/auth/principal.js";
import { HarnessStore } from "../core/state/sqlite.js";

function fixture() {
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "harness-approval-"));
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "harness-workspace-"));
  const store = new HarnessStore(state);
  const service = new ApprovalService(store);
  const worker = workerPrincipal("canary");
  const action = createActionRecord({
    principalId: worker.id,
    taskId: "task_test",
    projectId: "project_test",
    workspacePath: workspace,
    toolId: "workspace.write",
    arguments: { path: "README.md", content: "safe content", overwrite: true },
    risk: "R3",
    policyVersion: "test",
  });
  return { state, store, service, worker, action };
}

describe("approval state machine", () => {
  it("authenticates only through a protected operator verifier", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-operator-auth-"));
    const verifier = path.join(root, "operator-auth.json");
    const passphrase = "correct horse battery staple";
    await initializeOperator("operator", passphrase, verifier);
    assert.equal(fs.statSync(verifier).mode & 0o077, 0);
    assert.equal(await verifyOperatorPassphrase(passphrase, verifier), "operator");
    await assert.rejects(
      verifyOperatorPassphrase("incorrect passphrase value", verifier),
      /authentication failed/
    );
    fs.chmodSync(verifier, 0o644);
    await assert.rejects(
      verifyOperatorPassphrase(passphrase, verifier),
      /permissions are too broad/
    );
  });

  it("approves and consumes an exact action once", () => {
    const { store, service, worker, action } = fixture();
    const request = service.request(action, { path: "README.md" });
    service.decide(request.id, humanPrincipal("operator"), "approved");
    const consumed = service.consume({
      approvalId: request.id,
      actionDigest: actionDigest(action),
      principalId: worker.id,
    });
    assert.equal(consumed.toolId, "workspace.write");
    assert.equal(service.get(request.id).status, "consumed");
    assert.throws(() =>
      service.consume({
        approvalId: request.id,
        actionDigest: actionDigest(action),
        principalId: worker.id,
      })
    );
    store.close();
  });

  it("allows only one consumer across independent database connections", () => {
    const { state, store, service, worker, action } = fixture();
    const secondStore = new HarnessStore(state);
    const secondService = new ApprovalService(secondStore);
    const request = service.request(action, { path: "README.md" });
    service.decide(request.id, humanPrincipal("operator"), "approved");
    const attempts = [service, secondService].map((candidate) => {
      try {
        candidate.consume({
          approvalId: request.id,
          actionDigest: actionDigest(action),
          principalId: worker.id,
        });
        return "consumed";
      } catch {
        return "denied";
      }
    });
    assert.deepEqual(attempts.sort(), ["consumed", "denied"]);
    secondStore.close();
    store.close();
  });

  it("rejects mutation, wrong principal, and self-approval", () => {
    const { store, service, worker, action } = fixture();
    const request = service.request(action, { path: "README.md" });
    service.decide(request.id, humanPrincipal("operator"), "approved");
    assert.throws(() =>
      service.consume({
        approvalId: request.id,
        actionDigest: "0".repeat(64),
        principalId: worker.id,
      })
    );
    assert.throws(() =>
      service.consume({
        approvalId: request.id,
        actionDigest: actionDigest(action),
        principalId: "worker:other",
      })
    );

    const selfAction = createActionRecord({
      principalId: "human:operator",
      projectId: "project_test",
      workspacePath: action.workspacePath,
      toolId: "workspace.write",
      arguments: { path: "README.md", content: "safe content", overwrite: true },
      risk: "R3",
      policyVersion: "test",
    });
    const selfRequest = service.request(selfAction, {});
    assert.throws(() =>
      service.decide(selfRequest.id, humanPrincipal("operator"), "approved")
    );
    store.close();
  });

  it("expires instead of silently allowing", () => {
    const { store, service, action } = fixture();
    const created = new Date("2026-01-01T00:00:00.000Z");
    const expiring = createActionRecord({
      principalId: action.principalId,
      projectId: action.projectId,
      workspacePath: action.workspacePath,
      toolId: action.toolId,
      arguments: { path: "README.md", content: "safe content", overwrite: true },
      risk: "R3",
      policyVersion: "test",
      ttlMs: 1_000,
      now: created,
    });
    const request = service.request(expiring, {});
    assert.throws(() =>
      service.decide(
        request.id,
        humanPrincipal("operator"),
        "approved",
        new Date(created.getTime() + 2_000)
      )
    );
    assert.equal(service.get(request.id).status, "expired");
    store.close();
  });
});
