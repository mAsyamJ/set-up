import fs from "node:fs";
import path from "node:path";
import { harnessStateHome } from "../state/sqlite.js";

export function killSwitchPath(): string {
  return path.join(harnessStateHome(), "runtime.disabled");
}

export function mutationsDisabled(): boolean {
  return fs.existsSync(killSwitchPath());
}

export function disableMutations(reason: string): void {
  const target = killSwitchPath();
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    target,
    `${JSON.stringify({ disabledAt: new Date().toISOString(), reason }, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600, flag: "wx" }
  );
}

export function enableMutations(): void {
  const target = killSwitchPath();
  if (fs.existsSync(target)) fs.unlinkSync(target);
}
