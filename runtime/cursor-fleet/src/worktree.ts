import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function allocateWorktree(
  harnessRoot: string,
  projectRoot: string,
  taskId: string,
  branchBase?: string
): Promise<string> {
  const script = path.join(harnessRoot, "scripts/lib/worktree-pool.sh");
  const args = ["bash", "-c", `source "${script}" && worktree_allocate "${projectRoot}" "${taskId}" "${branchBase ?? ""}"`];
  const { stdout } = await execFileAsync(args[0], args.slice(1), { env: process.env });
  const wt = stdout.trim().split("\n").pop()?.trim();
  if (!wt) throw new Error(`worktree_allocate failed for ${taskId}`);
  return wt;
}

export async function releaseWorktree(
  harnessRoot: string,
  projectRoot: string,
  taskId: string,
  deleteBranch = false
): Promise<void> {
  const script = path.join(harnessRoot, "scripts/lib/worktree-pool.sh");
  const flag = deleteBranch ? "1" : "0";
  await execFileAsync("bash", [
    "-c",
    `source "${script}" && worktree_release "${projectRoot}" "${taskId}" "${flag}"`,
  ]);
}
