#!/usr/bin/env node
import { verifyOperatorPassphrase } from "../core/approvals/operator-auth.js";
import { humanPrincipal } from "../core/auth/principal.js";
import { getRegisteredProject } from "../core/projects/registry.js";
import { HarnessStore, projectStateDir } from "../core/state/sqlite.js";
import { TaskService } from "../core/tasks/task-service.js";
import { readSecret } from "./tty.js";

async function human() {
  const passphrase = await readSecret("Operator passphrase: ");
  return humanPrincipal(await verifyOperatorPassphrase(passphrase));
}

async function main(): Promise<void> {
  const [command, projectRef, taskId] = process.argv.slice(2);
  if (!command || !projectRef) {
    throw new Error("Usage: harness task {list|show|queue|recover} <project> [task-id]");
  }
  const project = getRegisteredProject(projectRef);
  const store = new HarnessStore(projectStateDir(project.canonicalPath));
  const tasks = new TaskService(store);
  try {
    if (command === "list") {
      console.log(JSON.stringify(tasks.list(project.id), null, 2));
      return;
    }
    if (command === "show" && taskId) {
      console.log(JSON.stringify(tasks.get(taskId), null, 2));
      return;
    }
    if (command === "queue" && taskId) {
      console.log(JSON.stringify(tasks.queue(taskId, await human()), null, 2));
      return;
    }
    if (command === "recover") {
      await human();
      console.log(JSON.stringify({ recovered: tasks.recoverExpired() }, null, 2));
      return;
    }
    throw new Error("Usage: harness task {list|show|queue|recover} <project> [task-id]");
  } finally {
    store.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
