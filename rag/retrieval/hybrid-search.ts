import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RagStore, ragStateDir } from "../stores/sqlite-fts.js";
import { indexTasks, indexManifestAndContext, indexRepo } from "../ingestion/repo-indexer.js";
import { indexObsidianVault } from "../sources/obsidian-source.js";
import { rankSource } from "../policies/source-priority.js";
import { trustLabelForSource } from "../policies/source-trust-policy.js";
import type { SourceKind } from "../policies/source-priority.js";

const execFileAsync = promisify(execFile);

export type Citation = {
  path: string;
  source: SourceKind;
  title: string;
  snippet: string;
  trust: string;
  rank: number;
};

export type SearchResult = {
  query: string;
  citations: Citation[];
};

export type RagConfig = {
  include?: string[];
  exclude?: string[];
  includeHarnessDocs?: boolean;
};

export function loadRagConfig(projectRoot: string): RagConfig {
  const p = path.join(projectRoot, ".harness", "rag.config.json");
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8")) as RagConfig;
}

export function loadManifest(projectRoot: string) {
  const p = path.join(projectRoot, ".harness", "project.manifest.json");
  return JSON.parse(fs.readFileSync(p, "utf8")) as {
    paths?: { product?: string[]; docs?: string[] };
  };
}

export async function indexProject(
  projectRoot: string,
  harnessRoot: string,
  opts: { incremental?: boolean } = {}
): Promise<{ counts: Record<string, number> }> {
  const store = new RagStore(ragStateDir(projectRoot));
  const manifest = loadManifest(projectRoot);
  const counts: Record<string, number> = {};

  counts.task = indexTasks(projectRoot, store);
  counts.manifest = indexManifestAndContext(projectRoot, store);
  counts.repo = indexRepo(
    projectRoot,
    store,
    manifest.paths?.product ?? [],
    manifest.paths?.docs ?? ["docs"]
  );
  counts.obsidian = indexObsidianVault(projectRoot, store);

  if (loadRagConfig(projectRoot).includeHarnessDocs !== false) {
    const kitDir = path.join(harnessRoot, "docs", "kit");
    if (fs.existsSync(kitDir)) {
      let n = 0;
      for (const f of fs.readdirSync(kitDir).filter((x) => x.endsWith(".md"))) {
        const abs = path.join(kitDir, f);
        store.upsert({
          path: abs,
          source: "harness",
          title: f,
          body: fs.readFileSync(abs, "utf8").slice(0, 50_000),
          mtime: fs.statSync(abs).mtimeMs,
        });
        n++;
      }
      counts.harness = n;
    }
  }

  store.close();
  return { counts };
}

export async function hybridSearch(
  projectRoot: string,
  harnessRoot: string,
  query: string,
  limit = 15
): Promise<SearchResult> {
  const store = new RagStore(ragStateDir(projectRoot));
  const ftsHits = store.searchFts(query, limit * 2);

  let rgHits: Citation[] = [];
  try {
    const { stdout } = await execFileAsync(
      "rg",
      ["-n", "--no-heading", "-m", "3", query, projectRoot, "--glob", "!.env", "--glob", "!.env.*"],
      { maxBuffer: 2 * 1024 * 1024 }
    );
    rgHits = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(0, 10)
      .map((line) => {
        const m = line.match(/^([^:]+):(\d+):(.*)$/);
        return {
          path: m?.[1] ?? line,
          source: "repo" as SourceKind,
          title: path.basename(m?.[1] ?? line),
          snippet: m?.[3]?.trim() ?? line,
          trust: trustLabelForSource("repo"),
          rank: rankSource("repo"),
        };
      });
  } catch {
    /* rg no matches */
  }

  const citations: Citation[] = ftsHits.map((h) => ({
    ...h,
    trust: trustLabelForSource(h.source),
    rank: rankSource(h.source),
  }));

  for (const r of rgHits) {
    if (!citations.some((c) => c.path === r.path)) citations.push(r);
  }

  citations.sort((a, b) => a.rank - b.rank || a.path.localeCompare(b.path));
  store.close();
  return { query, citations: citations.slice(0, limit) };
}
