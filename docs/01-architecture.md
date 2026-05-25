# Architecture

```txt
CLI / Cursor MCP / Hermes
        ↓
   Tool Gateway (R0–R5)
        ↓
   RAG + State + Obsidian
        ↓
   project/.harness/
```

**Lanes:** A (10m cron), O (5m timer), B (Kanban dispatch).

**Packages:** `core/`, `rag/`, `integrations/obsidian/`, `tools/gateway/`, `runtime/mcp/`, `runtime/a2a/`.

**Vault:** `~/dev/Project/_vaults/agentic-engineering/` (shared, cross-project).
