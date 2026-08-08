#!/usr/bin/env node
import process from "node:process";
import { ApprovalService } from "../core/approvals/approval-service.js";
import {
  initializeOperator,
  verifyOperatorPassphrase,
} from "../core/approvals/operator-auth.js";
import { humanPrincipal } from "../core/auth/principal.js";
import { getRegisteredProject } from "../core/projects/registry.js";
import { HarnessStore, projectStateDir } from "../core/state/sqlite.js";
import { readLine, readSecret } from "./tty.js";

function usage(): never {
  console.error(
    "Usage: harness approval {init <operator-id>|list <project>|show <project> <id>|approve <project> <id>|deny <project> <id>}"
  );
  process.exit(2);
}

async function main(): Promise<void> {
  const [command, first, second] = process.argv.slice(2);
  if (command === "init") {
    if (!first) usage();
    const passphrase = await readSecret("New operator passphrase: ");
    const confirmation = await readSecret("Confirm operator passphrase: ");
    if (passphrase !== confirmation) throw new Error("passphrases do not match");
    await initializeOperator(first, passphrase);
    console.log("Operator authentication initialized.");
    return;
  }

  if (!command || !first) usage();
  const project = getRegisteredProject(first);
  const store = new HarnessStore(projectStateDir(project.canonicalPath));
  const approvals = new ApprovalService(store);
  try {
    if (command === "list") {
      console.log(JSON.stringify(approvals.list(), null, 2));
      return;
    }
    if (!second) usage();
    const approval = approvals.get(second);
    if (command === "show") {
      console.log(JSON.stringify(approval, null, 2));
      return;
    }
    if (command !== "approve" && command !== "deny") usage();
    console.log(JSON.stringify(approval, null, 2));
    const digest = await readLine("Re-enter the full action digest: ");
    if (digest !== approval.digest) throw new Error("action digest confirmation failed");
    const passphrase = await readSecret("Operator passphrase: ");
    const operatorId = await verifyOperatorPassphrase(passphrase);
    const decided = approvals.decide(
      approval.id,
      humanPrincipal(operatorId),
      command === "approve" ? "approved" : "denied"
    );
    console.log(JSON.stringify(decided, null, 2));
  } finally {
    store.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
