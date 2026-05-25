#!/usr/bin/env python3
"""Text-safe merge of harness MCP into ~/.hermes/config.yaml."""
import re
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 4:
        print("Usage: merge-hermes-harness-mcp.py <config.yaml> <harness_home> <project_root>", file=sys.stderr)
        return 1

    config_path = Path(sys.argv[1])
    harness_home = sys.argv[2]
    project_root = sys.argv[3]
    marker = "# agent-harness mcp_servers.harness (auto-merged)"

    harness_block = f"""  harness:
    command: node
    args:
      - "--import"
      - "tsx"
      - "{harness_home}/runtime/mcp/harness-mcp-server/src/server.ts"
    env:
      AGENT_HARNESS_HOME: "{harness_home}"
      AEGIS_WORKSPACE: "{project_root}"
      AEGIS_RPC_ROOT: "{project_root}"
"""

    text = config_path.read_text(encoding="utf-8") if config_path.exists() else ""

    text = re.sub(
        rf"\n{re.escape(marker)}.*?(?=\n# agent-harness|\Z)",
        "",
        text,
        flags=re.DOTALL,
    )

    if re.search(r"^\s+harness:\s*$", text, re.MULTILINE):
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text(text.rstrip() + "\n", encoding="utf-8")
        print(f"OK: mcp_servers.harness already present in {config_path}")
        return 0

    if "mcp_servers:" in text:
        lines = text.splitlines()
        out: list[str] = []
        inserted = False
        for line in lines:
            out.append(line)
            if not inserted and line.strip() == "mcp_servers:":
                out.append(harness_block.rstrip())
                inserted = True
        new_text = "\n".join(out) if inserted else text.rstrip() + f"\n\n{marker}\nmcp_servers:\n" + harness_block
    else:
        new_text = text.rstrip() + f"\n\n{marker}\nmcp_servers:\n" + harness_block

    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(new_text.rstrip() + "\n", encoding="utf-8")
    print(f"OK: merged mcp_servers.harness into {config_path}")
    print(f"  AEGIS_WORKSPACE: {project_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
