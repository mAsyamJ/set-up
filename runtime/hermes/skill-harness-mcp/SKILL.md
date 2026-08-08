---
name: harness-mcp
description: Restricted read-only Harness MCP tools for the optional Hermes operator
---

# Restricted Harness MCP

Use only tools advertised by the configured `harness` MCP server. The Harness
gateway authenticates this session as `hermes-operator`; arguments cannot
change that identity or grant additional capabilities.

Initial tools:

- `harness_health`
- `harness_list_projects`
- `harness_project_inspect`
- `harness_rag_search`
- `harness_task_list`
- `harness_task_get`

`harness_task_submit` is present only after the separate H3 activation gate. It
creates a proposal and cannot approve, queue, lease, or execute it.

Never request or emulate approval response, filesystem writes, shell execution,
Git mutation, service management, merge, push, deploy, or fleet activation.
Cursor and Hermes have independent model configuration and failure boundaries.
