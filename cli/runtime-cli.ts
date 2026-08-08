#!/usr/bin/env node
import {
  disableMutations,
  enableMutations,
  killSwitchPath,
  mutationsDisabled,
} from "../core/runtime/kill-switch.js";
import { verifyOperatorPassphrase } from "../core/approvals/operator-auth.js";
import { readLine, readSecret } from "./tty.js";

async function authenticate(): Promise<void> {
  const passphrase = await readSecret("Operator passphrase: ");
  await verifyOperatorPassphrase(passphrase);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "status") {
    console.log(JSON.stringify({ mutationsDisabled: mutationsDisabled(), path: killSwitchPath() }));
    return;
  }
  if (command === "disable") {
    await authenticate();
    const reason = await readLine("Reason for emergency stop: ");
    disableMutations(reason || "operator emergency stop");
    console.log("Harness mutations disabled.");
    return;
  }
  if (command === "enable") {
    await authenticate();
    const confirmation = await readLine("Type ENABLE to clear the kill switch: ");
    if (confirmation !== "ENABLE") throw new Error("confirmation failed");
    enableMutations();
    console.log("Harness mutation kill switch cleared.");
    return;
  }
  throw new Error("Usage: harness runtime {status|disable|enable}");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
