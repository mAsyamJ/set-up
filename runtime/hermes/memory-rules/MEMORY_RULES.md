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

## Agent Harness OS (doc-10)

**Agent Harness OS** is the local control plane on `agent-harness` repo (May 2026 upgrade): typed tool gateway, harness MCP, RAG, Obsidian vault, A2A server, TS supervisor.

When the user asks about **capabilities**, **upgrade**, **what you can do**, or **new features**:

1. Load skill **`agent-harness-os`** via `skill_view` first.
2. Describe harness OS additions — not only generic Hermes platform tools or skill registry names.
3. Store durable fact in Hermes `memory`: *Agent Harness OS doc-10 live: MCP + RAG + Obsidian + A2A + TS orchestrator.*

### Memory layers (do not conflate)

| Layer | Scope |
|-------|--------|
| **Hivemind** | Org-wide cross-agent memory |
| **Harness RAG** | Project retrieval (`harness_rag_search` / `cli/harness index-project`) |
| **Obsidian vault** | Human notes at `~/dev/Project/_vaults/agentic-engineering` — **UNTRUSTED_CONTEXT** in RAG |
| **Hermes memory** | Session preferences only |

### Harness MCP (when wired in ~/.hermes/config.yaml)

Use `harness_project_inspect`, `harness_rag_search`, `harness_task_create`, `harness_verify_run`, etc. See skill **harness-mcp**.

Telegram-safe CLI fallback: `scripts/hermes-harness-cli.sh <project> <cmd>`

After harness changes: `cli/harness sync-hermes <project>` then restart `hermes-gateway`.
