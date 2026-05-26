#!/usr/bin/env python3
"""Merge cursor-fleet Kanban settings into ~/.hermes/config.yaml."""
import re
import sys
from pathlib import Path

MARKER = "# agent-harness kanban fleet (auto-merged)"


def main() -> int:
    config_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / ".hermes" / "config.yaml"
    block = f"""{MARKER}
kanban:
  dispatch_in_gateway: false
"""

    text = config_path.read_text(encoding="utf-8") if config_path.exists() else ""

    if re.search(r"^\s*dispatch_in_gateway:\s*false\s*$", text, re.MULTILINE):
        print(f"OK: kanban.dispatch_in_gateway already false in {config_path}")
        return 0

    if re.search(r"^\s*dispatch_in_gateway:\s*true\s*$", text, re.MULTILINE):
        text = re.sub(
            r"^(\s*)dispatch_in_gateway:\s*true\s*$",
            r"\1dispatch_in_gateway: false",
            text,
            count=1,
            flags=re.MULTILINE,
        )
        config_path.write_text(text.rstrip() + "\n", encoding="utf-8")
        print(f"OK: set kanban.dispatch_in_gateway: false in {config_path}")
        return 0

    text = re.sub(rf"\n{re.escape(MARKER)}.*?(?=\n# agent-harness|\Z)", "", text, flags=re.DOTALL)

    if re.search(r"^kanban:\s*$", text, re.MULTILINE):
        if "dispatch_in_gateway:" not in text:
            text = re.sub(
                r"(^kanban:\s*$)",
                r"\1\n  dispatch_in_gateway: false",
                text,
                count=1,
                flags=re.MULTILINE,
            )
    else:
        text = text.rstrip() + "\n\n" + block

    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(text.rstrip() + "\n", encoding="utf-8")
    print(f"OK: merged kanban.dispatch_in_gateway: false into {config_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
