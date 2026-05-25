import fs from "node:fs";
import path from "node:path";

export type ObsidianConfig = {
  enabled: boolean;
  vaultPath: string;
  projectNotePath: string;
  projectSlug: string;
  projectDisplayName: string;
  writePolicy?: {
    allowCreateNotes?: boolean;
    allowUpdateIndex?: boolean;
    allowModifyExistingNotes?: boolean;
    requireFrontmatter?: boolean;
  };
  sync?: Record<string, boolean | string>;
  rag?: {
    includeInProjectRetrieval?: boolean;
    includeFolders?: string[];
    excludeFolders?: string[];
  };
};

export function loadObsidianConfig(projectRoot: string): ObsidianConfig | null {
  const p = path.join(projectRoot, ".harness", "obsidian.config.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as ObsidianConfig;
}

export const DEFAULT_VAULT_PATH = path.join(
  process.env.HOME ?? "",
  "dev",
  "Project",
  "_vaults",
  "agentic-engineering"
);

export function resolveVaultPath(_projectRoot: string, cfg: ObsidianConfig): string {
  let p = cfg.vaultPath;
  if (p.startsWith("~/")) {
    return path.resolve(p.replace(/^~/, process.env.HOME ?? ""));
  }
  if (path.isAbsolute(p)) return p;
  if (p.includes("_vaults")) return DEFAULT_VAULT_PATH;
  return path.resolve(_projectRoot, p);
}

export const VAULT_DIRS = [
  "00-Inbox/quick-captures",
  "00-Inbox/unsorted",
  "01-Projects",
  "02-Agents",
  "03-Skills",
  "04-Research/MCP",
  "04-Research/A2A",
  "04-Research/RAG",
  "04-Research/Agent Frameworks",
  "05-Decisions",
  "06-Runs",
  "07-Patterns",
  "08-Templates",
  "99-Archive",
];
