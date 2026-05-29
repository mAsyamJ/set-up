# Understand-Anything Plugin Status (Learn Anything / Understand Anything)

**Date:** 2026-05-28

## Confirmation

- User explicitly confirmed (via structured question in session): **Yes, the Understand-Anything plugin is installed and the user can run `/understand` commands right now** in the current Cursor environment for this workspace.

## Local Filesystem Evidence (at time of check)

- No `.cursor-plugin/` directory found in the agent-harness repo root.
- No `.cursor-plugin/` directory found inside the MEV project.
- No `.understand-anything/` directory found yet (expected — it is created on first `/understand` run).

## How Cursor Handles the Plugin

Per the official Understand-Anything repo:

> Cursor auto-discovers the plugin via `.cursor-plugin/plugin.json` when this repo is cloned.

Because the plugin is available globally in the user's Cursor installation, the `/understand` family of commands should be directly invocable without further local installation steps.

## Recommended First Commands (to be executed by user / agent session)

From the project root (`projects/defi-lab/mev_share_backrun_flashloan_arbitrage`):

```bash
# Full project analysis (recommended for initial KG)
# This will create .understand-anything/ at the workspace or project level
/understand

# Or scoped to the most important content for this harness effort
/understand docs .harness/research

# For the rich learning notes (highly recommended)
/understand-knowledge .workspace/DeFiMEVLearn.md
```

After running, the primary artifact will be:

`.understand-anything/knowledge-graph.json`

## Next Step in This Plan

Once the above commands have been executed and the JSON is available, proceed to the next todo (`run-local-scan` / capture of the graph).

## Notes for Agents

- The generated graph (plus the manual synthesis we will perform in this directory) becomes the canonical "deep understanding" layer for the entire MEV shadow searcher project.
- All future implementation, architecture, and innovation work should reference this KG.
- The KG must strictly respect V1 boundaries (shadow-only, no live execution, deterministic risk authoritative, Postgres as source of truth, etc.).

## References

- [LearnAnything.md](../../../../../.workspace/LearnAnything.md) (original instructions)
- Understand-Anything GitHub: https://github.com/Lum1104/Understand-Anything
