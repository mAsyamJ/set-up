#!/usr/bin/env node
import { verifyOperatorPassphrase } from "../core/approvals/operator-auth.js";
import { getRegisteredProject } from "../core/projects/registry.js";
import { migrateStateDatabase, projectStateDir } from "../core/state/sqlite.js";
import { readLine, readSecret } from "./tty.js";

async function main(): Promise<void> {
  const [command, projectRef] = process.argv.slice(2);
  if (command !== "migrate" || !projectRef) {
    throw new Error("Usage: harness state migrate <project>");
  }
  const project = getRegisteredProject(projectRef);
  const passphrase = await readSecret("Operator passphrase: ");
  await verifyOperatorPassphrase(passphrase);
  const confirmation = await readLine(`Type MIGRATE ${project.slug} to back up and migrate state: `);
  if (confirmation !== `MIGRATE ${project.slug}`) throw new Error("confirmation failed");
  console.log(JSON.stringify(migrateStateDatabase(projectStateDir(project.canonicalPath)), null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
