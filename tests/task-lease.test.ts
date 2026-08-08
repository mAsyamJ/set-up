import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fixedPrincipal, humanPrincipal } from "../core/auth/principal.js";
import { HarnessStore } from "../core/state/sqlite.js";
import { TaskService } from "../core/tasks/task-service.js";

describe("transactional task leases", () => {
  it("binds an idempotency key to the exact submission", () => {
    const state = fs.mkdtempSync(path.join(os.tmpdir(), "harness-task-idempotency-"));
    const store = new HarnessStore(state);
    const tasks = new TaskService(store);
    const principal = fixedPrincipal("hermes-operator");
    const input = {
      projectId: "project",
      workspaceId: "workspace",
      title: "Canary",
      objective: "Change one file",
      scope: { paths: ["message.txt"] },
      idempotencyKey: "same-key",
      principal,
    };
    const first = tasks.submit(input);
    assert.equal(tasks.submit(input).id, first.id);
    assert.throws(
      () => tasks.submit({ ...input, objective: "Substituted objective" }),
      /different task submission/
    );
    store.close();
  });

  it("allows exactly one claimant and validates worker ownership", () => {
    const state = fs.mkdtempSync(path.join(os.tmpdir(), "harness-lease-"));
    const firstStore = new HarnessStore(state);
    const secondStore = new HarnessStore(state);
    const first = new TaskService(firstStore);
    const second = new TaskService(secondStore);
    const task = first.submit({
      projectId: "project",
      workspaceId: "workspace",
      title: "Canary",
      objective: "Change one file",
      scope: { paths: ["message.txt"] },
      idempotencyKey: "canary-1",
      principal: fixedPrincipal("hermes-operator"),
    });
    first.queue(task.id, humanPrincipal("operator"));
    const lease = first.claim({ taskId: task.id, workerId: "one", ttlMs: 10_000 });
    assert.throws(() => second.claim({ taskId: task.id, workerId: "two" }));
    assert.throws(() =>
      second.requireActiveLease({ taskId: task.id, workerId: "two", token: lease.token })
    );
    assert.equal(
      first.requireActiveLease({ taskId: task.id, workerId: "one", token: lease.token }).id,
      lease.id
    );
    firstStore.close();
    secondStore.close();
  });

  it("recovers an expired lease without deleting work", () => {
    const state = fs.mkdtempSync(path.join(os.tmpdir(), "harness-lease-expire-"));
    const store = new HarnessStore(state);
    const tasks = new TaskService(store);
    const now = new Date("2026-01-01T00:00:00.000Z");
    const task = tasks.submit({
      projectId: "project",
      workspaceId: "workspace",
      title: "Recover",
      objective: "Preserve work",
      scope: {},
      idempotencyKey: "recover-1",
      principal: fixedPrincipal("hermes-operator"),
    });
    tasks.queue(task.id, humanPrincipal("operator"));
    tasks.claim({ taskId: task.id, workerId: "one", ttlMs: 5_000, now });
    const recovered = tasks.recoverExpired(new Date(now.getTime() + 6_000));
    assert.deepEqual(recovered, [task.id]);
    assert.equal(tasks.get(task.id).state, "recoverable");
    store.close();
  });
});
