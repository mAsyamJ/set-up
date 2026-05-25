#!/usr/bin/env node
import path from "node:path";
import { indexProject } from "../../rag/retrieval/hybrid-search.js";

async function main() {
  const projectRoot = path.resolve(process.argv[2] ?? ".");
  const incremental = process.argv.includes("--incremental");
  const harnessRoot = process.env.AGENT_HARNESS_HOME ?? path.resolve(import.meta.dirname, "../..");
  const { counts } = await indexProject(projectRoot, harnessRoot, { incremental });
  console.log(JSON.stringify({ ok: true, counts, incremental }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
