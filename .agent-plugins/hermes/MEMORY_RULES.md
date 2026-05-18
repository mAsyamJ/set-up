# Hermes memory rules (Aegis stack)

## Shared org memory: Hivemind

**Hivemind (Deeplake) is the cross-agent memory layer** for this workspace. Cursor, Hermes, and Codex capture sessions into the same org store. Kiro CLI uses the `hivemind` MCP server in `.kiro/settings/mcp.json`.

When the user asks whether memory is shared across Kiro, Cursor, or Hermes:

- Answer **yes for Hivemind-backed recall** across wired assistants.
- Do **not** claim each runtime is fully isolated without checking Hivemind first.

### Hermes tools for shared memory

| Tool | Use |
|------|-----|
| `hivemind_search` | Keyword search across org summaries and sessions |
| `hivemind_read` | Read a specific path from search results |
| `hivemind_index` | List indexed sessions |

Prefer these before saying "I don't have context from other tools."

### Hermes-native memory (auxiliary)

| Tool | Scope |
|------|--------|
| `memory` | Durable facts for **Hermes** sessions (preferences, env quirks) |
| `session_search` | Past **Hermes** transcripts |

These complement Hivemind; they do not replace org-wide search.

## Telegram + Kiro bridge

Telegram uses `hermes-gateway` → Kiro bridge (`:8787`) → `kiro-cli`. The bridge injects a short Hivemind index snippet into prompts. For deep recall, Hermes runtime should use `hivemind_search` when the provider supports tool use; otherwise rely on injected context + filesystem (`AGENTS.md`, `.hermes/plans/`).

## Filesystem coordination

All agents can read/write: `AGENTS.md`, `docs/`, `.hermes/plans/`, Kanban boards, `docs/AI_COLLABORATION_LOG.md` (app repo).

## Storage

- Org tables: Deeplake API (`hivemind whoami`)
- Optional local mirror: `~/.deeplake/memory/index.md` → `summaries/` → `sessions/`

## Capture health

If summaries fail (502 in `~/.hermes/hooks/deeplake-wiki.log`), run `scripts/verify-hivemind-shared-memory.sh` and ensure `OPENROUTER_API_KEY` is set for wiki summarization (`hermes -z`).
