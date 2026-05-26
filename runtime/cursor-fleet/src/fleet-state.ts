import fs from "node:fs";
import path from "node:path";

export type WorkerRecord = {
  id: string;
  board: string;
  taskId: string;
  projectRoot: string;
  worktreePath: string;
  assignee: string;
  nodeId: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  endedAt: string | null;
  summary: string | null;
};

type StateFile = {
  workers: WorkerRecord[];
};

export class FleetStore {
  private filePath: string;

  constructor(stateDir: string) {
    fs.mkdirSync(stateDir, { recursive: true });
    this.filePath = path.join(stateDir, "cursor-fleet.json");
    if (!fs.existsSync(this.filePath)) {
      this.write({ workers: [] });
    }
  }

  private read(): StateFile {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, "utf8")) as StateFile;
    } catch {
      return { workers: [] };
    }
  }

  private write(state: StateFile): void {
    fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }

  countRunning(nodeId?: string): number {
    const workers = this.read().workers.filter((w) => w.status === "running");
    if (nodeId) return workers.filter((w) => w.nodeId === nodeId).length;
    return workers.length;
  }

  startWorker(rec: Omit<WorkerRecord, "endedAt" | "summary" | "status">): void {
    const state = this.read();
    state.workers = state.workers.filter((w) => w.id !== rec.id);
    state.workers.push({
      ...rec,
      status: "running",
      endedAt: null,
      summary: null,
    });
    this.write(state);
  }

  endWorker(id: string, status: "completed" | "failed", summary: string): void {
    const state = this.read();
    const w = state.workers.find((x) => x.id === id);
    if (w) {
      w.status = status;
      w.endedAt = new Date().toISOString();
      w.summary = summary;
    }
    this.write(state);
  }

  listRunning(nodeId?: string): WorkerRecord[] {
    return this.read().workers.filter(
      (w) => w.status === "running" && (!nodeId || w.nodeId === nodeId)
    );
  }

  close(): void {
    /* no-op for JSON backend */
  }
}
