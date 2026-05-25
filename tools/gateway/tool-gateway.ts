import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { checkToolAllowed, getToolPolicy } from "../../core/policy/tool-policy.js";
import { resolveInProject, isSecretPath } from "../../core/policy/path-policy.js";
import type { GatewayContext, ProjectManifest, ToolResult } from "../../core/types.js";
import { hybridSearch } from "../../rag/retrieval/hybrid-search.js";

const execFileAsync = promisify(execFile);
const POLICY = getToolPolicy();

export type { GatewayContext, ProjectManifest, ToolResult };
export { createRunId } from "../../core/types.js";
export { checkToolAllowed } from "../../core/policy/tool-policy.js";

export function loadManifest(projectRoot: string): ProjectManifest {
  const p = path.join(projectRoot, ".harness", "project.manifest.json");
  return JSON.parse(fs.readFileSync(p, "utf8")) as ProjectManifest;
}

export class ToolGateway {
  constructor(private ctx: GatewayContext) {}

  async call<T = unknown>(tool: string, args: Record<string, unknown> = {}): Promise<ToolResult<T>> {
    const gate = checkToolAllowed(tool, args);
    if (!gate.allowed) return { ok: false, tool, error: gate.reason };

    try {
      switch (tool) {
        case "repo.read": return this.repoRead(args) as Promise<ToolResult<T>>;
        case "repo.search": return this.repoSearch(args) as Promise<ToolResult<T>>;
        case "git.status": return this.gitCmd(["status", "--short"], "git.status") as Promise<ToolResult<T>>;
        case "git.diff": return this.gitCmd(["diff", "--stat"], "git.diff") as Promise<ToolResult<T>>;
        case "task.move": return this.taskMove(args) as Promise<ToolResult<T>>;
        case "task.create": return this.taskCreate(args) as Promise<ToolResult<T>>;
        case "project.inspect": return this.projectInspect() as Promise<ToolResult<T>>;
        case "rag.search": return this.ragSearch(args) as Promise<ToolResult<T>>;
        case "verify.run": return this.verifyRun(args) as Promise<ToolResult<T>>;
        case "patch.propose": return this.patchPropose(args) as Promise<ToolResult<T>>;
        default: return { ok: false, tool, error: `not implemented: ${tool}` };
      }
    } catch (err) {
      return { ok: false, tool, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async repoRead(args: Record<string, unknown>): Promise<ToolResult<{ content: string; path: string }>> {
    const rel = String(args.path ?? "");
    if (!rel) return { ok: false, tool: "repo.read", error: "path required" };
    const abs = resolveInProject(this.ctx.projectRoot, rel);
    return { ok: true, tool: "repo.read", data: { path: rel, content: fs.readFileSync(abs, "utf8") } };
  }

  private async repoSearch(args: Record<string, unknown>): Promise<ToolResult<{ matches: string[] }>> {
    const query = String(args.query ?? "");
    if (!query) return { ok: false, tool: "repo.search", error: "query required" };
    if (isSecretPath(query)) return { ok: false, tool: "repo.search", error: "secrets query denied" };
    const { stdout } = await execFileAsync("rg", ["-l", query, this.ctx.projectRoot, "--glob", "!.env"], { maxBuffer: 2 * 1024 * 1024 });
    return { ok: true, tool: "repo.search", data: { matches: stdout.trim().split("\n").filter(Boolean).slice(0, 50) } };
  }

  private async gitCmd(extra: string[], tool: string): Promise<ToolResult<{ output: string }>> {
    const { stdout } = await execFileAsync("git", extra, { cwd: this.ctx.projectRoot, maxBuffer: 4 * 1024 * 1024 });
    return { ok: true, tool, data: { output: stdout } };
  }

  private async taskCreate(args: Record<string, unknown>): Promise<ToolResult<{ path: string }>> {
    const title = String(args.title ?? "Untitled");
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const dir = path.join(this.ctx.projectRoot, ".harness", "tasks", "backlog");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${slug}.md`);
    const tpl = path.join(this.ctx.harnessRoot, "templates/tasks/task.md.tpl");
    let body = `# ${title}\n\nStatus: backlog\n`;
    if (fs.existsSync(tpl)) {
      body = fs.readFileSync(tpl, "utf8")
        .replace(/\{\{TITLE\}\}/g, title)
        .replace(/\{\{TASK_ID\}\}/g, `task_${slug}`)
        .replace(/\{\{KANBAN_ID\}\}/g, "")
        .replace(/\{\{PHASE\}\}/g, String(args.phase ?? "general"))
        .replace(/\{\{OBJECTIVE\}\}/g, title);
    }
    fs.writeFileSync(file, body);
    return { ok: true, tool: "task.create", data: { path: file } };
  }

  private async taskMove(args: Record<string, unknown>): Promise<ToolResult<{ from: string; to: string }>> {
    const from = String(args.from ?? "");
    const toFolder = String(args.to ?? "");
    const allowed = ["backlog", "active", "review", "done", "blocked"];
    if (!allowed.includes(toFolder)) return { ok: false, tool: "task.move", error: "invalid to folder" };
    const tasksRoot = path.join(this.ctx.projectRoot, ".harness", "tasks");
    const src = path.join(tasksRoot, from.includes("/") ? from : `active/${from}`);
    const dest = path.join(tasksRoot, toFolder, path.basename(src));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
    return { ok: true, tool: "task.move", data: { from: src, to: dest } };
  }

  private async projectInspect(): Promise<ToolResult<Record<string, unknown>>> {
    const manifest = loadManifest(this.ctx.projectRoot);
    const ctxPath = path.join(this.ctx.projectRoot, ".harness", "project-context.md");
    const context = fs.existsSync(ctxPath) ? fs.readFileSync(ctxPath, "utf8") : "";
    const activeDir = path.join(this.ctx.projectRoot, ".harness", "tasks", "active");
    const activeTasks = fs.existsSync(activeDir)
      ? fs.readdirSync(activeDir).filter((f) => f.endsWith(".md"))
      : [];
    return { ok: true, tool: "project.inspect", data: { manifest, contextPreview: context.slice(0, 2000), activeTasks } };
  }

  private async ragSearch(args: Record<string, unknown>): Promise<ToolResult<unknown>> {
    const query = String(args.query ?? "");
    if (!query) return { ok: false, tool: "rag.search", error: "query required" };
    const result = await hybridSearch(this.ctx.projectRoot, this.ctx.harnessRoot, query);
    return { ok: true, tool: "rag.search", data: result };
  }

  private async patchPropose(args: Record<string, unknown>): Promise<ToolResult<{ preview: string }>> {
    const diff = String(args.diff ?? "");
    if (!diff) {
      const { stdout } = await execFileAsync("git", ["diff", "--stat"], { cwd: this.ctx.projectRoot });
      return { ok: true, tool: "patch.propose", data: { preview: stdout } };
    }
    return { ok: true, tool: "patch.propose", data: { preview: diff.slice(0, 8000) } };
  }

  private async verifyRun(args: Record<string, unknown>): Promise<ToolResult<{ results: Record<string, { ok: boolean; output: string }> }>> {
    const manifest = loadManifest(this.ctx.projectRoot);
    const keys = (args.commands as string[] | undefined) ?? ["typecheck", "test"];
    const results: Record<string, { ok: boolean; output: string }> = {};
    for (const key of keys) {
      const cmd = manifest.commands?.[key];
      if (!cmd) { results[key] = { ok: true, output: "(skipped)" }; continue; }
      if (POLICY.forbiddenPatterns.some((p) => cmd.includes(p))) {
        results[key] = { ok: false, output: "blocked by policy" }; continue;
      }
      try {
        const { stdout, stderr } = await execFileAsync("bash", ["-c", cmd], { cwd: this.ctx.projectRoot, maxBuffer: 8 * 1024 * 1024, timeout: 120_000 });
        results[key] = { ok: true, output: stdout + stderr };
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        results[key] = { ok: false, output: (e.stdout ?? "") + (e.stderr ?? "") + (e.message ?? "") };
      }
    }
    return { ok: Object.values(results).every((r) => r.ok), tool: "verify.run", data: { results } };
  }
}
