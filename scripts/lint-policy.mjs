#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const roots = [
  "core",
  "cli",
  "tools/gateway",
  "tools/fs-broker",
  "runtime/mcp/harness-mcp-server/src",
  "rag",
];
const extensions = new Set([".ts", ".js", ".mjs", ".py", ".sh"]);
const checks = [
  {
    pattern: /(?<!\.)\b(?:eval|exec|execSync)\s*\(/,
    message: "dynamic eval/exec is forbidden in active Harness code",
  },
  { pattern: /shell\s*:\s*true/, message: "shell execution mode is forbidden" },
  { pattern: /["'](?:bash|sh)["']\s*,\s*\[\s*["']-c["']/, message: "shell command strings are forbidden" },
  { pattern: /git\s+worktree\s+remove\s+--force/, message: "force worktree removal is forbidden" },
  { pattern: /systemctl[^\\n]*(?:enable|--now)/, message: "active code may not enable services" },
];

function files(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...files(target));
    else if (extensions.has(path.extname(entry.name))) output.push(target);
  }
  return output;
}

const failures = [];
for (const relativeRoot of roots) {
  const directory = path.join(root, relativeRoot);
  if (!fs.existsSync(directory)) continue;
  for (const file of files(directory)) {
    const content = fs.readFileSync(file, "utf8");
    for (const check of checks) {
      if (check.pattern.test(content)) {
        failures.push(`${path.relative(root, file)}: ${check.message}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`policy lint passed (${roots.length} active roots)`);
