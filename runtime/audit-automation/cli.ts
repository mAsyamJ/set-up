#!/usr/bin/env node
import path from "node:path";
import { defaultConfig, readConfig, writeConfig } from "./config.js";
import { generateAuditReport } from "./report.js";
import { readCurrentRun } from "./state.js";
import { runAuditCycle } from "./runner.js";

function usage() {
  console.error("Usage: cli/harness audit <run|status|report|schedule|config> <project> [...]");
  process.exit(1);
}

function scheduleDisabled(projectRoot: string): never {
  throw new Error(
    `audit scheduling is disabled; no service or Hermes cron was installed for ${projectRoot}`
  );
}

async function main() {
  const sub = process.argv[2];
  const projectRoot = process.argv[3] ? path.resolve(process.argv[3]) : "";
  if (!sub || !projectRoot) usage();

  if (sub === "run") {
    const resumeOnly = process.argv.includes("--resume-only");
    const result = await runAuditCycle(projectRoot, { resumeOnly });
    console.log(result.report.markdown);
    return;
  }

  if (sub === "status") {
    const state = readCurrentRun(projectRoot);
    console.log(JSON.stringify(state || { status: "idle" }, null, 2));
    return;
  }

  if (sub === "report") {
    const report = await generateAuditReport(projectRoot, readConfig(projectRoot), readCurrentRun(projectRoot));
    console.log(report.markdown);
    return;
  }

  if (sub === "schedule") {
    scheduleDisabled(projectRoot);
  }

  if (sub === "config") {
    const op = process.argv[4];
    if (op === "get") {
      console.log(JSON.stringify(readConfig(projectRoot), null, 2));
      return;
    }
    if (op === "set") {
      const key = process.argv[5];
      const value = process.argv[6];
      if (!key) usage();
      const cfg = readConfig(projectRoot) as Record<string, unknown>;
      const parsedValue =
        value === "true"
          ? true
          : value === "false"
            ? false
            : value != null && /^-?\d+$/.test(value)
              ? Number(value)
              : value;
      if (key.includes(".")) {
        const [first, second] = key.split(".", 2);
        cfg[first] = { ...((cfg[first] as Record<string, unknown>) || {}), [second]: parsedValue };
      } else {
        cfg[key] = parsedValue;
      }
      writeConfig(projectRoot, cfg as ReturnType<typeof defaultConfig>);
      console.log(JSON.stringify(readConfig(projectRoot), null, 2));
      return;
    }
    usage();
  }

  usage();
}

main().catch((err) => {
  console.error(String((err as Error)?.stack || err));
  process.exit(1);
});
