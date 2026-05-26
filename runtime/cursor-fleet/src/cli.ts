#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  fleetDoctor,
  fleetStartDaemon,
  fleetStatus,
  fleetTick,
  loadFleetConfig,
} from "./fleet-manager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = path.resolve(__dirname, "../../..");

async function main(): Promise<void> {
  const sub = process.argv[2] ?? "once";
  const cfg = loadFleetConfig(harnessRoot);

  if (process.env.AEGIS_CURSOR_FLEET_ENABLED === "0") {
    console.log("cursor-fleet disabled (AEGIS_CURSOR_FLEET_ENABLED=0)");
    return;
  }

  switch (sub) {
    case "once": {
      const result = await fleetTick(cfg);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "start": {
      const interval = Number(process.env.AEGIS_CURSOR_FLEET_INTERVAL_MS ?? 30_000);
      await fleetStartDaemon(cfg, interval);
      return;
    }
    case "status": {
      console.log(await fleetStatus(cfg));
      return;
    }
    case "doctor": {
      const { ok, lines } = await fleetDoctor(cfg);
      for (const line of lines) console.log(line);
      process.exit(ok ? 0 : 1);
    }
    default:
      console.error("Usage: cursor-fleet {once|start|status|doctor}");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
