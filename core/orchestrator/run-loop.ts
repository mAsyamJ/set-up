export type RunLoopOptions = {
  taskFile: string;
  skipVerify?: boolean;
};

export async function runSupervisorLoop(
  _projectRoot: string,
  _opts: RunLoopOptions
): Promise<{ runId: string; ok: boolean }> {
  throw new Error(
    "legacy supervisor disabled; use the transactional task and lease runtime after its canary gate"
  );
}
