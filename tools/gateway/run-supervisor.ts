#!/usr/bin/env node
import path from "node:path";
import { runSupervisorLoop } from "../../core/orchestrator/run-loop.js";

async function main() {
  const projectRoot = path.resolve(process.argv[2] ?? ".");
  const taskFile = process.argv[3] ?? "";
  if (!taskFile) {
    console.error("Usage: run-supervisor.ts <project-root> <task-file>");
    process.exit(1);
  }
  const result = await runSupervisorLoop(projectRoot, { taskFile, skipVerify: process.argv.includes("--skip-verify") });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
