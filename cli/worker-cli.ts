#!/usr/bin/env node
import { verifyOperatorPassphrase } from "../core/approvals/operator-auth.js";
import { getRegisteredProject } from "../core/projects/registry.js";
import { WorkerSupervisor } from "../core/runtime/worker-supervisor.js";
import { readLine, readSecret } from "./tty.js";

async function main(): Promise<void> {
  const [command, projectRef, taskId] = process.argv.slice(2);
  if (command !== "run" || !projectRef || !taskId) {
    throw new Error("Usage: harness worker run <canary-project> <task-id>");
  }
  const project = getRegisteredProject(projectRef);
  const passphrase = await readSecret("Operator passphrase: ");
  await verifyOperatorPassphrase(passphrase);
  const confirmation = await readLine(
    `Type ${project.slug} to launch one foreground Hermes canary worker: `
  );
  if (confirmation !== project.slug) throw new Error("confirmation failed");
  const supervisor = new WorkerSupervisor();
  const result = await supervisor.runForeground({
    project,
    taskId,
    workerId: `hermes-canary-${process.pid}`,
    hermesExecutable: process.env.HARNESS_HERMES_WORKER_BIN ?? "harnessworker",
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.taskState === "review" ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
