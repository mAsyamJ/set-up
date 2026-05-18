# Hivemind shared memory (Kiro)

Org memory is shared via **Hivemind** (Deeplake), same store as Cursor, Hermes, and Codex on this machine.

## Before claiming "no prior context"

1. Call **`hivemind_search`** (MCP server `hivemind`) with keywords from the user's question.
2. If hits exist, use **`hivemind_read`** on the best path, or **`hivemind_index`** to list sessions.

## Do not say

- "Kiro has no shared memory with Cursor/Hermes" — use Hivemind MCP first.
- "Memory is only in this session" — check Hivemind unless search returns nothing.

## Auxiliary stores

| Store | Scope |
|-------|--------|
| Hivemind (Deeplake) | Cross-agent org memory (primary) |
| Kiro `~/.kiro/sessions/` | This CLI only |
| Repo `AGENTS.md`, `.hermes/plans/` | Filesystem coordination |

## Auth

Run `hivemind whoami` if tools fail. Login: `hivemind login`.
