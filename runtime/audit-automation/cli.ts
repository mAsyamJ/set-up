#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { defaultConfig, readConfig, writeConfig } from "./config.js";
import { generateAuditReport } from "./report.js";
import { readCurrentRun } from "./state.js";
import { runAuditCycle } from "./runner.js";

const execFileAsync = promisify(execFile);

function usage() {
  console.error("Usage: cli/harness audit <run|status|report|schedule|config> <project> [...]");
  process.exit(1);
}

async function installSchedule(projectRoot: string) {
  const cfg = readConfig(projectRoot);
  const slug = cfg.projectSlug;
  const home = process.env.HOME || "";
  const systemdDir = path.join(home, ".config", "systemd", "user");
  fs.mkdirSync(systemdDir, { recursive: true });
  const serviceName = `aegis-audit-resume-${slug}.service`;
  const timerName = `aegis-audit-resume-${slug}.timer`;
  const servicePath = path.join(systemdDir, serviceName);
  const timerPath = path.join(systemdDir, timerName);
  const harnessRoot = process.env.AGENT_HARNESS_HOME || path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
  const escapedProject = projectRoot.replace(/(["\\$`])/g, "\\$1");
  fs.writeFileSync(
    servicePath,
    `[Unit]
Description=Aegis audit resume loop (${slug})
After=network-online.target kiro-openai-bridge.service

[Service]
Type=oneshot
Environment=AGENT_HARNESS_HOME=${process.env.AGENT_HARNESS_HOME || harnessRoot}
ExecStart=/bin/bash -lc 'cd "${process.env.AGENT_HARNESS_HOME || harnessRoot}" && cli/harness audit run "${escapedProject}" --resume-only'
`,
    "utf8"
  );
  fs.writeFileSync(
    timerPath,
    `[Unit]
Description=Timer - Aegis audit resume loop (${slug})

[Timer]
OnBootSec=120s
OnUnitActiveSec=${cfg.resumeIntervalSec}s
AccuracySec=30s
Persistent=true
Unit=${serviceName}

[Install]
WantedBy=timers.target
`,
    "utf8"
  );

  try {
    await execFileAsync("systemctl", ["--user", "daemon-reload"], { env: process.env });
    await execFileAsync("systemctl", ["--user", "enable", "--now", timerName], { env: process.env });
  } catch {
    // best-effort only
  }

  const hermesScriptsDir = path.join(home, ".hermes", "scripts");
  fs.mkdirSync(hermesScriptsDir, { recursive: true });
  const statusScriptName = `aegis-audit-status-${slug}.sh`;
  const statusScriptPath = path.join(hermesScriptsDir, statusScriptName);
  fs.writeFileSync(
    statusScriptPath,
    `#!/usr/bin/env bash
set -euo pipefail
cd "${process.env.AGENT_HARNESS_HOME || harnessRoot}"
cli/harness audit report "${escapedProject}"
`,
    "utf8"
  );
  fs.chmodSync(statusScriptPath, 0o755);

  try {
    const list = await execFileAsync("hermes", ["cron", "list"], { env: process.env });
    const name = `aegis-audit-status-${slug}`;
    const text = String(list.stdout || "");
    let lastId = "";
    let existingId = "";
    for (const line of text.split("\n")) {
      const idMatch = line.match(/^\s*([0-9a-f]+)\s+\[/);
      if (idMatch) lastId = idMatch[1];
      if (line.includes(`Name: ${name}`)) {
        existingId = lastId;
        break;
      }
    }
    if (existingId) {
      await execFileAsync("hermes", ["cron", "remove", existingId], { env: process.env });
    }
    await execFileAsync(
      "hermes",
      [
        "cron",
        "create",
        cfg.statusCron,
        "--name",
        name,
        "--deliver",
        cfg.delivery,
        "--script",
        statusScriptName,
        "--no-agent",
        "--workdir",
        projectRoot,
      ],
      { env: process.env }
    );
  } catch {
    // best-effort only
  }

  console.log(`Installed ${serviceName}, ${timerName}, and Hermes status cron for ${slug}`);
}

async function removeSchedule(projectRoot: string) {
  const cfg = readConfig(projectRoot);
  const slug = cfg.projectSlug;
  const systemdDir = path.join(process.env.HOME || "", ".config", "systemd", "user");
  const serviceName = `aegis-audit-resume-${slug}.service`;
  const timerName = `aegis-audit-resume-${slug}.timer`;
  for (const file of [serviceName, timerName]) {
    const target = path.join(systemdDir, file);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
  try {
    await execFileAsync("systemctl", ["--user", "disable", "--now", timerName], { env: process.env });
    await execFileAsync("systemctl", ["--user", "daemon-reload"], { env: process.env });
  } catch {
    // best-effort only
  }
  console.log(`Removed audit schedule for ${slug}`);
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
    const op = process.argv[4];
    if (op === "install") {
      const cfg = readConfig(projectRoot);
      writeConfig(projectRoot, cfg);
      await installSchedule(projectRoot);
      return;
    }
    if (op === "remove") {
      await removeSchedule(projectRoot);
      return;
    }
    usage();
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
