---
id: "{{TASK_ID}}"
kanban_id: "{{KANBAN_ID}}"
title: "{{TITLE}}"
phase: "{{PHASE}}"
status: backlog
owned_paths: []
verification:
  - typecheck
  - test
---

# {{TITLE}}

Status: backlog

## Objective

{{OBJECTIVE}}

## Scope

- TBD

## Owned paths

- TBD

## Acceptance criteria

- [ ] TBD

## Verification

Run from project root (see `.harness/project.manifest.json`):

```bash
# typecheck, test, smoke — filled by harness verify-task
```

## Result

_(filled on completion)_
