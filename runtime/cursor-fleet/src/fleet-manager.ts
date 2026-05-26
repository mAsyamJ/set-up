import fs from "node:fs";
import path from "node:path";
import { runCursorAgent } from "./cursor-runner.js";
import { FleetStore } from "./fleet-state.js";
import {
  blockTask,
  boardStats,
  completeTask,
  heartbeatTask,
  listReadyTasks,
  showTask,
  workspaceToProjectRoot,
  type KanbanTask,
} from "./kanban-client.js";
import { modeForProfile, verifyPromptSuffix } from "./profile-modes.js";
import { allocateWorktree, releaseWorktree } from "./worktree.js";

export type FleetConfig = {
  harnessRoot: string;
  boards: string[];
  queueMax: number;
  maxConcurrent: number;
  nodeId: string;
  nodeCapacity: number;
  dryRun: boolean;
  defaultProjectRoot: string;
};

export type FleetTickResult = {
  spawned: number;
  skipped: string[];
  running: number;
  ready: number;
};

function fleetStateDir(harnessRoot: string): string {
  return path.join(harnessRoot, ".harness/state");
}

function loadRegistryBoards(harnessRoot: string): string[] {
  const regPath = path.join(harnessRoot, "projects/registry.json");
  if (!fs.existsSync(regPath)) return ["aegis-hackathon"];
  const reg = JSON.parse(fs.readFileSync(regPath, "utf8")) as {
    projects?: Record<string, { kanban?: string }>;
  };
  const boards = new Set<string>();
  for (const cfg of Object.values(reg.projects ?? {})) {
    if (cfg.kanban) boards.add(cfg.kanban);
  }
  return boards.size ? [...boards] : ["aegis-hackathon"];
}

function projectRootForBoard(harnessRoot: string, board: string, fallback: string): string {
  const regPath = path.join(harnessRoot, "projects/registry.json");
  if (!fs.existsSync(regPath)) return fallback;
  const reg = JSON.parse(fs.readFileSync(regPath, "utf8")) as {
    projects?: Record<string, { path?: string; kanban?: string }>;
  };
  for (const cfg of Object.values(reg.projects ?? {})) {
    if (cfg.kanban === board && cfg.path) {
      return path.isAbsolute(cfg.path) ? cfg.path : path.join(harnessRoot, cfg.path);
    }
  }
  return fallback;
}

function resolveProjectRoot(
  cfg: FleetConfig,
  board: string,
  task: KanbanTask
): string {
  const fromWorkspace = workspaceToProjectRoot(task.workspace, "");
  if (fromWorkspace && fs.existsSync(fromWorkspace)) {
    return fromWorkspace;
  }
  return projectRootForBoard(cfg.harnessRoot, board, cfg.defaultProjectRoot);
}

export function loadFleetConfig(harnessRoot: string): FleetConfig {
  const boardsEnv = process.env.AEGIS_KANBAN_BOARD?.trim();
  const boards = boardsEnv ? [boardsEnv] : loadRegistryBoards(harnessRoot);
  const maxConcurrent = Number(
    process.env.AEGIS_CURSOR_FLEET_NODE_CAPACITY ??
      process.env.AEGIS_CURSOR_FLEET_MAX_CONCURRENT ??
      4
  );
  return {
    harnessRoot,
    boards,
    queueMax: Number(process.env.AEGIS_CURSOR_FLEET_QUEUE_MAX ?? 20),
    maxConcurrent,
    nodeId: process.env.AEGIS_CURSOR_FLEET_NODE_ID ?? "local-wsl",
    nodeCapacity: maxConcurrent,
    dryRun: process.env.AEGIS_CURSOR_FLEET_DRY_RUN === "1",
    defaultProjectRoot:
      process.env.AEGIS_WORKSPACE ??
      process.env.AEGIS_RPC_ROOT ??
      path.join(harnessRoot, "projects/aegis-rpc"),
  };
}

function buildWorkerPrompt(task: KanbanTask, board: string, worktreePath: string): string {
  const assignee = task.assignee ?? "aegis-builder";
  return [
    `HERMES_KANBAN_TASK=${task.id}`,
    `HERMES_KANBAN_BOARD=${board}`,
    `HERMES_KANBAN_WORKSPACE=dir:${worktreePath}`,
    "",
    "SCOPE: only edit files under this worktree. End with kanban complete or block.",
    "",
    `# Task: ${task.title}`,
    `Assignee profile: ${assignee}`,
    "",
    task.body ?? "",
    verifyPromptSuffix(assignee),
  ].join("\n");
}

async function runWorker(
  cfg: FleetConfig,
  store: FleetStore,
  board: string,
  task: KanbanTask,
  projectRoot: string
): Promise<void> {
  const workerId = `${cfg.nodeId}-${task.id}-${Date.now()}`;
  const assignee = task.assignee ?? "aegis-builder";
  const mode = modeForProfile(assignee);

  let worktreePath: string;
  try {
    worktreePath = await allocateWorktree(cfg.harnessRoot, projectRoot, task.id);
  } catch (err) {
    await blockTask(board, task.id, `worktree allocate failed: ${String((err as Error).message)}`);
    return;
  }

  store.startWorker({
    id: workerId,
    board,
    taskId: task.id,
    projectRoot,
    worktreePath,
    assignee,
    nodeId: cfg.nodeId,
    startedAt: new Date().toISOString(),
  });

  const prompt = buildWorkerPrompt(task, board, worktreePath);
  const hb = setInterval(() => {
    heartbeatTask(board, task.id, "cursor-fleet worker active").catch(() => {});
  }, 180_000);

  try {
    const result = await runCursorAgent({
      prompt,
      cwd: worktreePath,
      mode,
      harnessRoot: cfg.harnessRoot,
    });

    const endStore = new FleetStore(fleetStateDir(cfg.harnessRoot));
    try {
      if (result.ok) {
        const summary = result.text.slice(0, 500) || "cursor-fleet completed";
        await completeTask(board, task.id, summary);
        endStore.endWorker(workerId, "completed", summary);
        await releaseWorktree(cfg.harnessRoot, projectRoot, task.id, false);
      } else {
        const reason = result.error ?? "cursor agent failed";
        await blockTask(board, task.id, reason);
        endStore.endWorker(workerId, "failed", reason);
      }
    } finally {
      endStore.close();
    }
  } catch (err) {
    const reason = String((err as Error).message ?? err);
    await blockTask(board, task.id, reason).catch(() => {});
    const endStore = new FleetStore(fleetStateDir(cfg.harnessRoot));
    try {
      endStore.endWorker(workerId, "failed", reason);
    } finally {
      endStore.close();
    }
  } finally {
    clearInterval(hb);
  }
}

export async function fleetTick(cfg: FleetConfig): Promise<FleetTickResult> {
  const store = new FleetStore(fleetStateDir(cfg.harnessRoot));
  const skipped: string[] = [];
  let spawned = 0;
  let totalReady = 0;

  try {
    const running = store.countRunning(cfg.nodeId);
    let slots = Math.min(cfg.nodeCapacity, cfg.maxConcurrent) - running;
    if (slots <= 0) {
      return { spawned: 0, skipped: ["slots full"], running, ready: 0 };
    }

    for (const board of cfg.boards) {
      if (slots <= 0) break;
      const stats = await boardStats(board);
      totalReady += stats.ready;

      const tasks = await listReadyTasks(board, Math.min(slots, cfg.queueMax));
      for (const brief of tasks) {
        if (slots <= 0) break;
        if (store.countRunning(cfg.nodeId) >= cfg.nodeCapacity) {
          skipped.push("capacity reached mid-tick");
          break;
        }

        const full = await showTask(board, brief.id);
        if (full.assignee === "-" || !full.assignee) {
          full.assignee = "aegis-builder";
        }

        const activeIds = new Set(store.listRunning(cfg.nodeId).map((w) => w.taskId));
        if (activeIds.has(full.id)) {
          skipped.push(`already running: ${full.id}`);
          continue;
        }

        const projectRoot = resolveProjectRoot(cfg, board, full);

        if (cfg.dryRun) {
          console.log(
            `[dry-run] would spawn ${full.id} on ${board} assignee=${full.assignee} project=${projectRoot}`
          );
          spawned++;
          slots--;
          continue;
        }

        void runWorker(cfg, store, board, full, projectRoot);
        spawned++;
        slots--;
      }
    }

    return {
      spawned,
      skipped,
      running: store.countRunning(cfg.nodeId),
      ready: totalReady,
    };
  } finally {
    store.close();
  }
}

export async function fleetStatus(cfg: FleetConfig): Promise<string> {
  const store = new FleetStore(fleetStateDir(cfg.harnessRoot));
  try {
    const lines: string[] = [
      `node: ${cfg.nodeId}`,
      `capacity: ${cfg.nodeCapacity} concurrent`,
      `queue_max: ${cfg.queueMax}`,
      `boards: ${cfg.boards.join(", ")}`,
      `running_workers: ${store.countRunning(cfg.nodeId)}`,
    ];
    for (const w of store.listRunning(cfg.nodeId)) {
      lines.push(`  - ${w.taskId} @ ${w.board} (${w.assignee}) ${w.worktreePath}`);
    }
    for (const board of cfg.boards) {
      const stats = await boardStats(board);
      lines.push(`board ${board}: ready=${stats.ready} running=${stats.running} blocked=${stats.blocked}`);
    }
    return lines.join("\n");
  } finally {
    store.close();
  }
}

export async function fleetDoctor(cfg: FleetConfig): Promise<{ ok: boolean; lines: string[] }> {
  const lines: string[] = [];
  let ok = true;

  const hermesBin = process.env.HERMES_BIN ?? `${process.env.HOME}/.local/bin/hermes`;
  if (!fs.existsSync(hermesBin)) {
    lines.push("FAIL hermes CLI not found");
    ok = false;
  } else {
    lines.push("OK   hermes CLI present");
  }

  const sdkDir = path.join(cfg.harnessRoot, "tools/kiro-openai-bridge/node_modules/@cursor/sdk");
  if (!fs.existsSync(sdkDir)) {
    lines.push("WARN @cursor/sdk not installed — run: npm install in tools/kiro-openai-bridge");
  } else {
    lines.push("OK   @cursor/sdk present");
  }

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (apiKey) {
    lines.push("OK   CURSOR_API_KEY set");
  } else {
    lines.push("INFO CURSOR_API_KEY unset — will use agent login if available");
  }

  lines.push(`INFO max_concurrent=${cfg.nodeCapacity} queue_max=${cfg.queueMax}`);

  return { ok, lines };
}

export async function fleetStartDaemon(cfg: FleetConfig, intervalMs = 30_000): Promise<void> {
  console.log(`cursor-fleet daemon node=${cfg.nodeId} interval=${intervalMs}ms`);
  for (;;) {
    try {
      const result = await fleetTick(cfg);
      console.log(
        `[cursor-fleet] spawned=${result.spawned} running=${result.running} ready=${result.ready}`
      );
    } catch (err) {
      console.error("[cursor-fleet] tick error:", err);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
