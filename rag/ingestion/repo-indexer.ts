import fs from "node:fs";
import path from "node:path";
import type { RagStore } from "../stores/sqlite-fts.js";
import type { SourceKind } from "../policies/source-priority.js";
import { isSecretPath } from "../../core/policy/path-policy.js";
import { resolveInProject } from "../../core/policy/path-policy.js";
import { redactText } from "../../core/security/redaction.js";

function shouldIndex(filePath: string, include: string[], exclude: string[]): boolean {
  if (isSecretPath(filePath)) return false;
  const norm = filePath.replace(/\\/g, "/");
  if (exclude.some((e) => norm.includes(e))) return false;
  if (include.length === 0) return true;
  return include.some((i) => norm.includes(i));
}

function indexFile(store: RagStore, abs: string, source: SourceKind, rootLabel: string): void {
  let confined: string;
  try {
    confined = resolveInProject(rootLabel, path.relative(rootLabel, abs));
  } catch {
    return;
  }
  if (!fs.existsSync(confined) || !fs.statSync(confined).isFile()) return;
  if (fs.statSync(confined).size > 1_000_000) return;
  const body = redactText(fs.readFileSync(confined, "utf8"));
  const title = path.basename(confined);
  store.upsert({
    path: confined,
    source,
    title,
    body: body.slice(0, 50_000),
    mtime: fs.statSync(confined).mtimeMs,
  });
}

function walkDir(dir: string, cb: (file: string) => void): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      walkDir(full, cb);
    } else if (/\.(md|txt|json|ts|tsx|js|jsx|py|go|rs|sol)$/i.test(ent.name)) {
      cb(full);
    }
  }
}

export function indexTasks(projectRoot: string, store: RagStore): number {
  store.clearSource("task");
  let n = 0;
  const tasksRoot = path.join(projectRoot, ".harness", "tasks");
  for (const folder of ["active", "backlog", "review", "done"]) {
    const dir = path.join(tasksRoot, folder);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
      indexFile(store, path.join(dir, f), "task", projectRoot);
      n++;
    }
  }
  return n;
}

export function indexManifestAndContext(projectRoot: string, store: RagStore): number {
  store.clearSource("manifest");
  store.clearSource("context");
  let n = 0;
  const manifest = path.join(projectRoot, ".harness", "project.manifest.json");
  const context = path.join(projectRoot, ".harness", "project-context.md");
  if (fs.existsSync(manifest)) {
    indexFile(store, manifest, "manifest", projectRoot);
    n++;
  }
  if (fs.existsSync(context)) {
    indexFile(store, context, "context", projectRoot);
    n++;
  }
  return n;
}

export function indexRepo(
  projectRoot: string,
  store: RagStore,
  productPaths: string[] = [],
  docPaths: string[] = ["docs"]
): number {
  store.clearSource("repo");
  const include = [...productPaths, ...docPaths];
  const exclude = ["node_modules", ".git", "dist", "build", ".next", ".turbo", ".vercel", ".harness/state", ".harness/worktrees"];
  let n = 0;
  const roots = include.length ? include.map((p) => path.join(projectRoot, p)) : [projectRoot];
  for (const root of roots) {
    walkDir(root, (file) => {
      if (shouldIndex(file, include.length ? include : [""], exclude)) {
        indexFile(store, file, "repo", projectRoot);
        n++;
      }
    });
  }
  return n;
}

export function indexDecisions(projectRoot: string, store: RagStore): number {
  store.clearSource("repo");
  let n = 0;
  for (const name of ["DECISIONS.md", "docs/decisions"]) {
    const p = path.join(projectRoot, name);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      indexFile(store, p, "repo", projectRoot);
      n++;
    }
  }
  return n;
}
