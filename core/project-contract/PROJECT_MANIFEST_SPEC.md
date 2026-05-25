# Project Manifest Spec

Schema: `agent-harness.project.v1`

Required fields:

- `project.name`, `project.type`, `project.root`
- `harness.harnessRootEnv` (default `AGENT_HARNESS_HOME`)
- `paths.product`, `paths.docs`, `paths.tasks`, `paths.state`
- `commands` — verification commands (`dev`, `typecheck`, `test`, `smoke`)
- `agents.enabled` — subset of generic harness agents
- `skills.enabled` — subset of harness skills
- `rules` — `noSecrets`, `requireTaskFile`, `requireVerification`

Location: `<project>/.harness/project.manifest.json`
