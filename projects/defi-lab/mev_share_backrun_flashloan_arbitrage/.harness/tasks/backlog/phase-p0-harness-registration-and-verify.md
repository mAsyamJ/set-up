# P0 — Harness registration, OpenSrc tracking, docs-only verify

## Goal

Project visible to the agent harness; contract files and backlog exist; OpenSrc study list authoritative; `harness-verify.sh` exits cleanly on a docs-only tree (no Cargo.toml yet).

## Acceptance

- [ ] `projects/registry.json` entry for `mev-share-backrun-flashloan-arbitrage` present and correct
- [ ] `.harness/project.manifest.json` committed with MEV-specific values
- [ ] Root `AGENTS.md`, `ORCHESTRATOR.md`, `DECISIONS.md` and `.harness/project-context.md` written from the MEV docs
- [ ] `.harness/opensrc-packages.txt` contains the full expanded research list; cache script has been run and `.harness/research/opensrc-paths/` is populated
- [ ] Full Knowledge Graph generated in `.harness/research/knowledgeGraph/` (both raw plugin JSON if available + complete structured Markdown suite: constraints, flows, OpenSrc provenance, innovation opportunities with BUILD tags, phase mapping, validation report). KG validated against all V1 gates and committed.
- [ ] `.harness/agents/` and `.harness/tasks/backlog/` populated with initial role and phase files
- [ ] `bash scripts/harness-verify.sh all` exits 0 with a docs/planning-phase message

## Owner

Orchestrator + OpenSrc Librarian
