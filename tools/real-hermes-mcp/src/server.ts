import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  HERMES_BIN,
  KIRO_BRIDGE_URL,
  WORKSPACE,
  mcpText,
  runCommand
} from "./exec.js";

const server = new McpServer({
  name: "real-hermes-mcp",
  version: "0.2.0"
});

server.tool(
  "real_hermes_stack_health",
  "Fast check: model bridge HTTP health, default provider, systemd units, and Hermes gateway status.",
  {},
  async () => {
    const sections: string[] = [];

    const bridge = await runCommand("curl", [
      "-sf",
      "--max-time",
      "3",
      `${KIRO_BRIDGE_URL}/health`
    ], 5000);
    sections.push(
      `=== Model bridge (${KIRO_BRIDGE_URL}) ===\n${bridge.text}`,
      bridge.isError ? "Bridge: UNHEALTHY" : "Bridge: OK"
    );

    if (!bridge.isError) {
      try {
        const health = JSON.parse(bridge.text) as {
          defaultModel?: string;
          providers?: { cursor?: { configured?: boolean } };
        };
        sections.push(
          `=== Active provider ===\ndefaultModel: ${health.defaultModel ?? "unknown"}`,
          `cursorConfigured: ${health.providers?.cursor?.configured ? "yes" : "no"}`
        );
        if (
          health.defaultModel === "cursor-composer-2" &&
          !health.providers?.cursor?.configured
        ) {
          sections.push(
            "WARN: Cursor is the active provider but CURSOR_API_KEY is not configured in ~/.hermes/.env"
          );
        }
      } catch {
        sections.push("=== Active provider ===\nCould not parse bridge health JSON");
      }
    }

    const provider = await runCommand("curl", [
      "-sf",
      "--max-time",
      "3",
      `${KIRO_BRIDGE_URL}/v1/admin/provider`
    ], 5000);
    if (!provider.isError) {
      sections.push(`=== Provider admin ===\n${provider.text}`);
    }

    const bridgeUnit = await runCommand("systemctl", [
      "--user",
      "is-active",
      "kiro-openai-bridge"
    ], 5000);
    sections.push(`=== systemd kiro-openai-bridge ===\n${bridgeUnit.text.trim()}`);

    const gatewayUnit = await runCommand("systemctl", [
      "--user",
      "is-active",
      "hermes-gateway"
    ], 5000);
    sections.push(`=== systemd hermes-gateway ===\n${gatewayUnit.text.trim()}`);

    const gw = await runCommand(HERMES_BIN, ["gateway", "status"], 20000);
    sections.push(`=== Hermes gateway ===\n${gw.text}`);

    const isError =
      bridge.isError ||
      bridgeUnit.text.includes("inactive") ||
      bridgeUnit.text.includes("failed") ||
      gatewayUnit.text.includes("inactive");

    return {
      content: [{ type: "text", text: sections.join("\n\n") }],
      isError
    };
  }
);

server.tool(
  "real_hermes_status",
  "Check real Nous Hermes Agent gateway status and config health.",
  {},
  async () => {
    const result = await runCommand(
      `${WORKSPACE}/scripts/real-hermes.sh`,
      ["status"],
      30000
    );
    return mcpText(result);
  }
);

server.tool(
  "real_hermes_gateway_logs",
  "Read recent logs from the real Hermes gateway systemd user service.",
  {
    lines: z.number().int().min(10).max(300).default(80)
  },
  async ({ lines }) => {
    const result = await runCommand(
      "journalctl",
      ["--user", "-u", "hermes-gateway", "-n", String(lines), "--no-pager", "-l"],
      45000
    );
    return mcpText(result);
  }
);

server.tool(
  "real_hermes_config_check",
  "Run real Hermes config check.",
  {},
  async () => {
    const result = await runCommand(HERMES_BIN, ["config", "check"], 20000);
    return mcpText(result);
  }
);

server.tool(
  "real_hermes_cli_help",
  "Show real Hermes CLI help.",
  {},
  async () => {
    const result = await runCommand(HERMES_BIN, ["--help"], 15000);
    return mcpText(result);
  }
);

server.tool(
  "real_hermes_model_help",
  "Show real Hermes model setup help without configuring a paid provider.",
  {},
  async () => {
    const result = await runCommand(HERMES_BIN, ["model", "--help"], 15000);
    return mcpText(result);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
