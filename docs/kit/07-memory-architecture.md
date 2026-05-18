# Memory: Hivemind vs Hermes vs Kiro vs filesystem

## Goal

One **org-wide** memory store (Hivemind) that Cursor, Hermes, Codex, and Kiro can read, plus filesystem files for explicit coordination.

## Layers

| Layer | Scope | How to use |
|-------|--------|------------|
| **Hivemind (Deeplake)** | Org-wide | `hivemind_search` / hooks; Kiro: `@hivemind` MCP |
| **Hermes `memory` tool** | Hermes sessions | Preferences, env facts |
| **Hermes `session_search`** | Hermes transcripts | Keyword recall within Hermes |
| **Kiro CLI sessions** | `~/.kiro/sessions/` | Local only unless captured via Hivemind MCP usage |
| **Filesystem** | Repo + plans | `AGENTS.md`, `.hermes/plans/`, Kanban |

## Wiring on this kit

```text
Cursor   → ~/.cursor/hooks.json → Deeplake capture
Codex    → ~/.codex/hooks.json
Hermes   → ~/.hermes/config.yaml hooks + mcp_servers.hivemind
Kiro     → .kiro/settings/mcp.json (hivemind + real-hermes)
Telegram → hermes-gateway → :8787 bridge → kiro-cli (index snippet injected)
```

Install once:

```bash
npm install -g @deeplake/hivemind
hivemind login
hivemind install
```

Verify:

```bash
~/dev/Project/aegis-hackathon-kit/scripts/verify-hivemind-shared-memory.sh
```

## Telegram path

| Service | Status |
|---------|--------|
| `hermes-gateway` | **Use this** |
| `telegram-kiro-gateway` | **Disabled** — no Hivemind |

See [docs/TELEGRAM_MEMORY_PATH.md](../../docs/TELEGRAM_MEMORY_PATH.md).

## Capture / wiki worker failures

Session **capture** runs on hooks. **Summaries** are built by a background wiki worker (`~/.hermes/hooks/deeplake-wiki.log`).

Common failures:

| Symptom | Likely cause |
|---------|----------------|
| `API 502` in wiki log | Deeplake API outage or auth |
| `hermes -z failed` | Missing/invalid `OPENROUTER_API_KEY` for summarization |
| No `~/.deeplake/memory/index.md` | Cloud-only mirror; org table may still have rows |

Diagnose:

```bash
~/dev/Project/aegis-hackathon-kit/scripts/diagnose-hivemind-capture.sh
```

Set OpenRouter key in `~/.hermes/.env` or environment if wiki worker cannot summarize.

## Kiro orchestrator

Use `kiro-cli --agent aegis-orchestrator`. Before "no prior context", call `hivemind_search`. Steering: [.kiro/steering/hivemind-memory.md](../../.kiro/steering/hivemind-memory.md).

## Hermes plugin rules

Telegram/Hermes persona memory rules: [.agent-plugins/hermes/MEMORY_RULES.md](../../.agent-plugins/hermes/MEMORY_RULES.md).
