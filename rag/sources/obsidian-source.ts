import fs from "node:fs";
import path from "node:path";
import type { RagStore } from "../stores/sqlite-fts.js";
import { isSecretPath } from "../../core/policy/path-policy.js";
import { loadObsidianConfig, resolveVaultPath } from "../../integrations/obsidian/vault-config.js";

function walkVault(dir: string, cb: (file: string) => void): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name.startsWith(".")) continue;
      walkVault(full, cb);
    } else if (ent.name.endsWith(".md")) {
      cb(full);
    }
  }
}

export function indexObsidianVault(projectRoot: string, store: RagStore): number {
  store.clearSource("obsidian");
  const cfg = loadObsidianConfig(projectRoot);
  if (!cfg?.enabled) return 0;

  const vaultRoot = resolveVaultPath(projectRoot, cfg);
  if (!fs.existsSync(vaultRoot)) return 0;

  let n = 0;
  const include = cfg.rag?.includeFolders ?? [];
  const exclude = cfg.rag?.excludeFolders ?? ["99-Archive", "00-Inbox/unsorted"];

  walkVault(vaultRoot, (file) => {
    const rel = file.slice(vaultRoot.length + 1).replace(/\\/g, "/");
    if (isSecretPath(file)) return;
    if (exclude.some((e) => rel.startsWith(e))) return;
    if (include.length && !include.some((i) => rel.startsWith(i))) return;
    store.upsert({
      path: file,
      source: "obsidian",
      title: path.basename(file, ".md"),
      body: fs.readFileSync(file, "utf8").slice(0, 50_000),
      mtime: fs.statSync(file).mtimeMs,
    });
    n++;
  });
  return n;
}
