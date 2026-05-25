# Hermes Integration

Hermes remains external orchestrator. Harness augments via:

- Bridge `@ 127.0.0.1:8787` (Kiro/Cursor workers)
- `real-hermes-mcp` for stack health
- `harness-mcp` for project tools
- Lanes A/O/B scripts in `scripts/`

Scheduled doctor: `cli/harness start-hermes-doctor <project>`

See [docs/kit/02-hermes-24-7.md](../docs/kit/02-hermes-24-7.md).
