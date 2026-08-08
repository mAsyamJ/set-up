# Agent Harness Repository Rules

This repository contains the generic Agent Harness control plane. Product
repositories are independent Git repositories and are not part of this source
tree.

## Control Planes

- Cursor is the primary interactive coding agent and selects its own model.
- Hermes is an optional operator with its own provider and model configuration.
- Cursor and Hermes may use the Harness MCP gateway, but neither is a model
  backend for the other.
- Hermes being offline must not prevent Cursor or the harness CLI from working.

## Safety Defaults

- Tool authorization is enforced in gateway code, not prompts.
- No project is selected by default.
- Runtime services, A2A, fleet workers, and installers are disabled by default.
- Bind local listeners to loopback and require authentication.
- Never auto-approve, merge, push, deploy, or clean a dirty worktree.
- Never execute shell strings from project manifests. Use trusted command IDs.
- Keep secrets outside Git and redact them from logs, audit records, and RAG.

## Repository Boundaries

- Machine project paths belong in
  `${XDG_CONFIG_HOME:-~/.config}/agent-harness/projects.json`.
- Runtime state belongs in
  `${XDG_STATE_HOME:-~/.local/state}/agent-harness/`.
- Product adapters (`AGENTS.md` and `.harness/project.manifest.json`) belong in
  each product repository.
- Open product repositories as separate Cursor workspaces. The harness
  `.cursorignore` excludes `projects/**`.

## Development

1. Run `cli/harness doctor` without a project to validate the harness itself.
2. Pass an explicit project path or set `AEGIS_WORKSPACE` for project tools.
3. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and
   `git diff --check` before review.
4. Preserve existing user changes and nested repositories.

The target architecture and rollout gates are documented in
`docs/architecture/agent-harness-v1.md`.
