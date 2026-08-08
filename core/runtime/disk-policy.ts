import fs from "node:fs";

export const MINIMUM_WORKER_FREE_BYTES = 5 * 1024 * 1024 * 1024;

export function diskFreeBytes(target: string): number {
  const stats = fs.statfsSync(target, { bigint: true });
  const available = stats.bavail * stats.bsize;
  return available > BigInt(Number.MAX_SAFE_INTEGER)
    ? Number.MAX_SAFE_INTEGER
    : Number(available);
}

export function assertDiskHeadroom(
  target: string,
  minimumBytes = MINIMUM_WORKER_FREE_BYTES
): void {
  const available = diskFreeBytes(target);
  if (available < minimumBytes) {
    throw new Error(
      `insufficient disk headroom: ${available} bytes available, ${minimumBytes} required`
    );
  }
}
