import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type KanbanTask = {
  id: string;
  title: string;
  assignee?: string;
  status?: string;
  workspace?: string;
  body?: string;
};

export type BoardStats = {
  ready: number;
  running: number;
  blocked: number;
  done: number;
};

async function hermes(args: string[]): Promise<string> {
  const bin = process.env.HERMES_BIN ?? `${process.env.HOME}/.local/bin/hermes`;
  try {
    const { stdout } = await execFileAsync(bin, args, {
      env: process.env,
      maxBuffer: 4 * 1024 * 1024,
    });
    return stdout;
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(e.stderr?.trim() || e.message || "hermes command failed");
  }
}

export async function boardStats(board: string): Promise<BoardStats> {
  const out = await hermes(["kanban", "--board", board, "stats"]);
  const stats: BoardStats = { ready: 0, running: 0, blocked: 0, done: 0 };
  for (const line of out.split("\n")) {
    const m = line.trim().match(/^(ready|running|blocked|done)\s+(\d+)/i);
    if (m) {
      const key = m[1].toLowerCase() as keyof BoardStats;
      stats[key] = Number(m[2]);
    }
  }
  return stats;
}

export async function listReadyTasks(board: string, limit: number): Promise<KanbanTask[]> {
  const out = await hermes(["kanban", "--board", board, "list"]);
  const tasks: KanbanTask[] = [];
  for (const line of out.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || /^[-=]/.test(trimmed)) continue;
    const idMatch = trimmed.match(/\b(t_[a-f0-9]+)\b/i);
    if (!idMatch) continue;
    const statusMatch = trimmed.match(/\b(ready|running|blocked|done)\b/i);
    const status = statusMatch?.[1]?.toLowerCase();
    if (status !== "ready") continue;
    const title = trimmed.replace(idMatch[0], "").replace(/\bready\b/i, "").trim() || idMatch[0];
    tasks.push({ id: idMatch[0], title, status: "ready" });
    if (tasks.length >= limit) break;
  }
  return tasks;
}

export async function showTask(board: string, taskId: string): Promise<KanbanTask> {
  const out = await hermes(["kanban", "--board", board, "show", taskId]);
  const task: KanbanTask = { id: taskId, title: taskId };
  for (const line of out.split("\n")) {
    const t = line.trim();
    if (/^title:/i.test(t)) task.title = t.replace(/^title:\s*/i, "").trim();
    if (/^assignee:/i.test(t)) task.assignee = t.replace(/^assignee:\s*/i, "").trim();
    if (/^status:/i.test(t)) task.status = t.replace(/^status:\s*/i, "").trim();
    if (/^workspace:/i.test(t)) task.workspace = t.replace(/^workspace:\s*/i, "").trim();
    if (/^body:/i.test(t)) task.body = t.replace(/^body:\s*/i, "").trim();
  }
  if (!task.body) {
    const bodyIdx = out.indexOf("body:");
    if (bodyIdx >= 0) {
      task.body = out.slice(bodyIdx + 5).trim();
    } else {
      task.body = out;
    }
  }
  return task;
}

export async function heartbeatTask(board: string, taskId: string, note: string): Promise<void> {
  await hermes(["kanban", "--board", board, "heartbeat", taskId, "--note", note]);
}

export async function completeTask(board: string, taskId: string, summary: string): Promise<void> {
  await hermes(["kanban", "--board", board, "complete", taskId, "--summary", summary]);
}

export async function blockTask(board: string, taskId: string, reason: string): Promise<void> {
  await hermes(["kanban", "--board", board, "block", taskId, reason]);
}

export async function claimRunning(board: string, taskId: string): Promise<void> {
  await hermes(["kanban", "--board", board, "claim", taskId]).catch(() => {
    /* claim may not exist on all hermes versions */
  });
}

export function workspaceToProjectRoot(workspace: string | undefined, fallback: string): string {
  if (!workspace) return fallback;
  const m = workspace.match(/^dir:(.+)$/);
  return m ? m[1].trim() : fallback;
}
