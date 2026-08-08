# Harness Tools

Active v1 tools:

- `gateway/`: typed, policy-enforcing Tool Gateway
- `fs-broker/`: descriptor-anchored confined file access
- `policies/`: deny-by-default tool and trusted command catalogs

`kiro-openai-bridge`, `real-hermes-mcp`, and `archive/` are legacy surfaces.
Their executable entrypoints refuse unconditionally and must not be installed,
started, or exposed to Cursor or Hermes.
