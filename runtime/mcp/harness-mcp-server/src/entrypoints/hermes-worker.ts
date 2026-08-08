import { workerPrincipal } from "../../../../../core/auth/principal.js";
import { startHarnessMcp } from "../server-factory.js";

const workerId = process.env.HARNESS_WORKER_ID;
const projectId = process.env.HARNESS_WORKER_PROJECT_ID;
const worktree = process.env.HARNESS_WORKER_WORKTREE;
const leaseToken = process.env.HARNESS_WORKER_LEASE_TOKEN;

if (!workerId || !projectId || !worktree || !leaseToken) {
  console.error("worker entrypoint requires supervisor-provided project, worktree, identity, and lease");
  process.exit(2);
}

startHarnessMcp({
  mode: "worker",
  principal: workerPrincipal(workerId),
  workerProjectId: projectId,
  workerWorktree: worktree,
  leaseToken,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
