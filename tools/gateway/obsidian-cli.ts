#!/usr/bin/env node
import path from "node:path";
import {
  scaffoldVault,
  writeProjectIndex,
  writeRunSummary,
  writeAdr,
  writeNote,
  buildObsidianUri,
} from "../../integrations/obsidian/note-writer.js";
import { loadObsidianConfig, resolveVaultPath } from "../../integrations/obsidian/vault-config.js";

async function main() {
  const [,, cmd, projectArg, ...rest] = process.argv;
  const projectRoot = path.resolve(projectArg ?? ".");

  switch (cmd) {
    case "init": {
      const vault = scaffoldVault(projectRoot);
      const index = writeProjectIndex(projectRoot);
      console.log(JSON.stringify({ ok: true, vault, index }, null, 2));
      break;
    }
    case "capture": {
      const title = rest.join(" ") || "Capture";
      const cfg = loadObsidianConfig(projectRoot)!;
      const vault = resolveVaultPath(projectRoot, cfg);
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const p = writeNote(vault, `00-Inbox/quick-captures/${slug}.md`, {
        type: "capture", project: cfg.projectSlug, title,
      }, `# ${title}\n\n`);
      console.log(JSON.stringify({ ok: true, path: p }, null, 2));
      break;
    }
    case "run-summary": {
      const runId = rest[0] ?? "manual";
      const p = writeRunSummary(projectRoot, runId, { goal: "run", summary: "completed via CLI" });
      console.log(JSON.stringify({ ok: true, path: p }, null, 2));
      break;
    }
    case "adr": {
      const title = rest.join(" ") || "Decision";
      const p = writeAdr(projectRoot, title, "Context TBD", "Decision TBD");
      console.log(JSON.stringify({ ok: true, path: p }, null, 2));
      break;
    }
    case "open": {
      const cfg = loadObsidianConfig(projectRoot)!;
      const note = rest[0] ?? cfg.projectNotePath;
      console.log(buildObsidianUri("agentic-engineering", note));
      break;
    }
    case "sync": {
      const { indexProject } = await import("../../rag/retrieval/hybrid-search.js");
      const harnessRoot = process.env.AGENT_HARNESS_HOME ?? path.resolve(import.meta.dirname, "../..");
      await indexProject(projectRoot, harnessRoot);
      console.log(JSON.stringify({ ok: true }, null, 2));
      break;
    }
    default:
      console.error("Usage: obsidian-cli.ts {init|capture|run-summary|adr|open|sync} <project> [args]");
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
