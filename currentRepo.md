# Aegis Hackathon Kit — Repository Architecture

Tree of folders and files (`folder/` → `|- file.ext`).

| Section | Contents |
|---------|----------|
| **Core kit** | `docs/`, `agents/`, `tasks/`, `tools/`, hackathon workspace |
| **Agent runtime** | Hermes/Kiro plugins, `.agents/skills`, `.skills` registries |

Bundled skill directories list subfolders + file counts (not every font/asset). Excludes `.git`, `node_modules`, build caches.


## Core kit (workspace)

```
aegis-hackathon-kit/
|- agents/
|   |- adapter-agent.md
|   |- AGENTS.md
|   |- ai-memo-agent.md
|   |- backend-rpc-agent.md
|   |- database-agent.md
|   |- devops-agent.md
|   |- frontend-dashboard-agent.md
|   |- orchestrator-agent.md
|   |- pitch-agent.md
|   |- policy-engine-agent.md
|   |- qa-agent.md
|   |- smart-contract-agent.md
|   `- transaction-decoder-agent.md
|- checklists/
|   |- demo-readiness.md
|   `- deployment-smoke.md
|- docs/
|   |- 00-product-brief.md
|   |- 01-hackathon-strategy.md
|   |- 02-system-architecture.md
|   |- 03-repository-structure.md
|   |- 04-api-spec.md
|   |- 05-transaction-decoder.md
|   |- 06-policy-engine.md
|   |- 07-adapter-layer.md
|   |- 08-ai-analysis-layer.md
|   |- 09-database-schema.md
|   |- 10-smart-contracts.md
|   |- 11-frontend-plan.md
|   |- 12-docker-local-dev.md
|   |- 13-deployment-plan.md
|   |- 14-testing-plan.md
|   |- 15-demo-script.md
|   |- 16-package-source-research.md
|   `- README.md
|- prompts/
|   |- debugging-prompt.md
|   `- master-build-prompt.md
|- runtime/
|   `- hermes-kiro/
|       |- kiro-openai-bridge.service
|       `- README.md
|- scripts/
|   |- lib/
|   |   `- paths.sh
|   |- providers/
|   |   `- kiro-provider.sh
|   |- check-agentic-workspace.sh
|   |- install-systemd-user.sh
|   |- install_workspace.sh
|   |- real-hermes.sh
|   |- setup-shell.sh
|   |- smoke-demo.sh
|   |- start-aegis-dev.sh
|   `- start-real-hermes-mcp.sh
|- systemd/
|   `- user/
|       |- aegis-stack.target
|       |- hermes-gateway.service
|       `- kiro-openai-bridge.service
|- tasks/
|   |- phase-00-repo-bootstrap.md
|   |- phase-01-rpc-gateway.md
|   |- phase-02-preflight-and-decoder.md
|   |- phase-03-policy-engine.md
|   |- phase-04-adapters.md
|   |- phase-05-database-audit-log.md
|   |- phase-06-dashboard-ui.md
|   |- phase-07-smart-contracts.md
|   |- phase-08-ai-analysis.md
|   |- phase-09-tests-and-smoke.md
|   |- phase-10-deploy.md
|   `- phase-11-demo-polish.md
|- templates/
|   |- aegis_rpc_agent_swarm_markdown/
|   |- aegis_rpc_agentic_workspace/
|   |   `- scripts/
|   `- templates/
|       |- docker-compose.yml
|       |- env.example
|       |- prompt-claude-review.md
|       `- prompt-kiro-task.md
|- tools/
|   |- docs/
|   |   |- templates/
|   |   |   |- AI_COLLABORATION_LOG.md
|   |   |   |- git-commit-template.txt
|   |   |   `- HACKATHON.md
|   |   |- 01-daily-setup.md
|   |   |- 02-hermes-24-7.md
|   |   |- 03-kiro-agents.md
|   |   |- 04-hackathon-lifecycle.md
|   |   |- 05-ai-collaboration.md
|   |   |- 06-mvp-and-demo.md
|   |   `- README.md
|   |- kiro-openai-bridge/
|   |   |- package-lock.json
|   |   |- package.json
|   |   `- server.js
|   |- real-hermes-mcp/
|   |   |- .kiro/
|   |   |   `- settings/
|   |   |       `- mcp.json
|   |   |- src/
|   |   |   |- exec.ts
|   |   |   `- server.ts
|   |   |- package-lock.json
|   |   `- package.json
|   `- telegram-kiro-gateway/
|       |- .env
|       |- index.js
|       |- package-lock.json
|       `- package.json
|- skills/  (~15 files)
|   |- algorithmic-art/  (~4 files)
|   |- brainstorming/  (~8 files)
|   |- brand-guidelines/  (~2 files)
|   |- canvas-design/  (~83 files)
|   |- caveman/  (~1 files)
|   |- claude-api/  (~44 files)
|   |- deploy-to-vercel/  (~3 files)
|   |- diagnose/  (~2 files)
|   |- dispatching-parallel-agents/  (~1 files)
|   |- doc-coauthoring/  (~1 files)
|   |- docx/  (~61 files)
|   |- executing-plans/  (~1 files)
|   |- find-skills/  (~1 files)
|   |- finishing-a-development-branch/  (~1 files)
|   |- frontend-design/  (~2 files)
|   |- grill-me/  (~1 files)
|   |- grill-with-docs/  (~3 files)
|   |- handoff/  (~1 files)
|   |- improve-codebase-architecture/  (~4 files)
|   |- internal-comms/  (~6 files)
|   |- mcp-builder/  (~10 files)
|   |- next-best-practices/  (~20 files)
|   |- next-cache-components/  (~1 files)
|   |- next-upgrade/  (~1 files)
|   |- pdf/  (~12 files)
|   |- pptx/  (~59 files)
|   |- prototype/  (~3 files)
|   |- receiving-code-review/  (~1 files)
|   |- requesting-code-review/  (~2 files)
|   |- setup-matt-pocock-skills/  (~6 files)
|   |- skill-creator/  (~18 files)
|   |- slack-gif-creator/  (~7 files)
|   |- subagent-driven-development/  (~4 files)
|   |- supabase/  (~3 files)
|   |- supabase-postgres-best-practices/  (~35 files)
|   |- systematic-debugging/  (~11 files)
|   |- tdd/  (~6 files)
|   |- template-skill/  (~1 files)
|   |- test-driven-development/  (~2 files)
|   |- theme-factory/  (~13 files)
|   |- to-issues/  (~1 files)
|   |- to-prd/  (~1 files)
|   |- triage/  (~3 files)
|   |- using-git-worktrees/  (~1 files)
|   |- using-superpowers/  (~4 files)
|   |- vercel-cli-with-tokens/  (~1 files)
|   |- vercel-composition-patterns/  (~14 files)
|   |- vercel-react-best-practices/  (~76 files)
|   |- vercel-react-native-skills/  (~42 files)
|   |- vercel-react-view-transitions/  (~8 files)
|   |- verification-before-completion/  (~1 files)
|   |- web-artifacts-builder/  (~5 files)
|   |- web-design-guidelines/  (~1 files)
|   |- webapp-testing/  (~6 files)
|   |- write-a-skill/  (~1 files)
|   |- writing-plans/  (~2 files)
|   |- writing-skills/  (~7 files)
|   |- xlsx/  (~54 files)
|   |- zoom-out/  (~1 files)
|   |- adapter-system-skill.md
|   |- ai-analysis-skill.md
|   |- approval-risk-skill.md
|   |- base-sepolia-deploy-skill.md
|   |- chainlink-price-adapter-skill.md
|   |- docker-dev-skill.md
|   |- opsrisk-dashboard-skill.md
|   |- policy-engine-skill.md
|   |- qa-demo-skill.md
|   |- rpc-gateway-skill.md
|   |- runtime-hermes-kiro-skill.md
|   |- simulation-skill.md
|   |- smart-contract-registry-skill.md
|   |- transaction-decoding-skill.md
|   `- vercel-deploy-skill.md
|- AGENTS.md
|- CLAUDE.md
|- DECISIONS.md
|- HACKATHON.md
|- MASTERPLAN.md
|- ORCHESTRATOR.md
|- README.md
|- SETUP_NEXT.md
|- WORKSPACE_INDEX.md
|- currentRepo.md
|- install-aegis-agent-skills.sh
|- progress.md
`- skills-lock.json
```

## Agent runtime & plugins

```
aegis-hackathon-kit/
|- .agent-plugins/
|   |- claude/
|   |   |- BUSINESS_REVIEW.md
|   |   |- REVIEW_ARCHITECTURE.md
|   |   `- SECURITY_REVIEW.md
|   |- codex/
|   |   |- DEBUG.md
|   |   |- IMPLEMENT_PHASE.md
|   |   |- SYSTEM.md
|   |   `- VERIFY_WORKSPACE.md
|   |- hermes/
|   |   |- MEMORY_RULES.md
|   |   |- ORCHESTRATE.md
|   |   `- SCHEDULED_CHECK.md
|   |- kiro/
|   |   |- EXECUTE_TASK.md
|   |   |- REPORT_RESULT.md
|   |   `- SYSTEM.md
|   |- plugin-manifest.json
|   `- README.md
|- .agents/
|   `- skills/  (~687 files)
|       |- algorithmic-art/  (~4 files)
|       |- brainstorming/  (~8 files)
|       |- brand-guidelines/  (~2 files)
|       |- canvas-design/  (~83 files)
|       |- caveman/  (~1 files)
|       |- claude-api/  (~44 files)
|       |- deploy-to-vercel/  (~3 files)
|       |- diagnose/  (~2 files)
|       |- dispatching-parallel-agents/  (~1 files)
|       |- doc-coauthoring/  (~1 files)
|       |- docx/  (~61 files)
|       |- executing-plans/  (~1 files)
|       |- find-skills/  (~1 files)
|       |- finishing-a-development-branch/  (~1 files)
|       |- frontend-design/  (~2 files)
|       |- grill-me/  (~1 files)
|       |- grill-with-docs/  (~3 files)
|       |- handoff/  (~1 files)
|       |- improve-codebase-architecture/  (~4 files)
|       |- internal-comms/  (~6 files)
|       |- mcp-builder/  (~10 files)
|       |- next-best-practices/  (~20 files)
|       |- next-cache-components/  (~1 files)
|       |- next-upgrade/  (~1 files)
|       |- pdf/  (~12 files)
|       |- pptx/  (~59 files)
|       |- prototype/  (~3 files)
|       |- receiving-code-review/  (~1 files)
|       |- requesting-code-review/  (~2 files)
|       |- setup-matt-pocock-skills/  (~6 files)
|       |- shadcn/  (~13 files)
|       |- skill-creator/  (~18 files)
|       |- slack-gif-creator/  (~7 files)
|       |- subagent-driven-development/  (~4 files)
|       |- supabase/  (~3 files)
|       |- supabase-postgres-best-practices/  (~35 files)
|       |- systematic-debugging/  (~11 files)
|       |- tdd/  (~6 files)
|       |- template-skill/  (~1 files)
|       |- test-driven-development/  (~2 files)
|       |- theme-factory/  (~13 files)
|       |- to-issues/  (~1 files)
|       |- to-prd/  (~1 files)
|       |- triage/  (~3 files)
|       |- using-git-worktrees/  (~1 files)
|       |- using-superpowers/  (~4 files)
|       |- vercel-cli-with-tokens/  (~1 files)
|       |- vercel-composition-patterns/  (~14 files)
|       |- vercel-react-best-practices/  (~76 files)
|       |- vercel-react-native-skills/  (~42 files)
|       |- vercel-react-view-transitions/  (~8 files)
|       |- verification-before-completion/  (~1 files)
|       |- web-artifacts-builder/  (~5 files)
|       |- web-design-guidelines/  (~1 files)
|       |- webapp-testing/  (~6 files)
|       |- write-a-skill/  (~1 files)
|       |- writing-plans/  (~2 files)
|       |- writing-skills/  (~7 files)
|       |- xlsx/  (~54 files)
|       `- zoom-out/  (~1 files)
|- .codex/
|- .cursor/
|   |- hooks/
|   |   `- state/
|   |       |- continual-learning-index.json
|   |       `- continual-learning.json
|   `- rules/
|       `- .cursor/
|           `- rules/
|               `- karpathy-guidelines.mdc
|- .hermes/
|   |- plans/
|   |   `- 24-7-multi-agent-environment.md
|   `- skills/  (~0 files)
|       |- algorithmic-art/  (~4 files)
|       |- brainstorming/  (~8 files)
|       |- brand-guidelines/  (~2 files)
|       |- canvas-design/  (~83 files)
|       |- caveman/  (~1 files)
|       |- claude-api/  (~44 files)
|       |- deploy-to-vercel/  (~3 files)
|       |- diagnose/  (~2 files)
|       |- dispatching-parallel-agents/  (~1 files)
|       |- doc-coauthoring/  (~1 files)
|       |- docx/  (~61 files)
|       |- executing-plans/  (~1 files)
|       |- find-skills/  (~1 files)
|       |- finishing-a-development-branch/  (~1 files)
|       |- frontend-design/  (~2 files)
|       |- grill-me/  (~1 files)
|       |- grill-with-docs/  (~3 files)
|       |- handoff/  (~1 files)
|       |- improve-codebase-architecture/  (~4 files)
|       |- internal-comms/  (~6 files)
|       |- mcp-builder/  (~10 files)
|       |- next-best-practices/  (~20 files)
|       |- next-cache-components/  (~1 files)
|       |- next-upgrade/  (~1 files)
|       |- pdf/  (~12 files)
|       |- pptx/  (~59 files)
|       |- prototype/  (~3 files)
|       |- receiving-code-review/  (~1 files)
|       |- requesting-code-review/  (~2 files)
|       |- setup-matt-pocock-skills/  (~6 files)
|       |- shadcn/  (~13 files)
|       |- skill-creator/  (~18 files)
|       |- slack-gif-creator/  (~7 files)
|       |- subagent-driven-development/  (~4 files)
|       |- supabase/  (~3 files)
|       |- supabase-postgres-best-practices/  (~35 files)
|       |- systematic-debugging/  (~11 files)
|       |- tdd/  (~6 files)
|       |- template-skill/  (~1 files)
|       |- test-driven-development/  (~2 files)
|       |- theme-factory/  (~13 files)
|       |- to-issues/  (~1 files)
|       |- to-prd/  (~1 files)
|       |- triage/  (~3 files)
|       |- using-git-worktrees/  (~1 files)
|       |- using-superpowers/  (~4 files)
|       |- vercel-cli-with-tokens/  (~1 files)
|       |- vercel-composition-patterns/  (~14 files)
|       |- vercel-react-best-practices/  (~76 files)
|       |- vercel-react-native-skills/  (~42 files)
|       |- vercel-react-view-transitions/  (~8 files)
|       |- verification-before-completion/  (~1 files)
|       |- web-artifacts-builder/  (~5 files)
|       |- web-design-guidelines/  (~1 files)
|       |- webapp-testing/  (~6 files)
|       |- write-a-skill/  (~1 files)
|       |- writing-plans/  (~2 files)
|       |- writing-skills/  (~7 files)
|       |- xlsx/  (~54 files)
|       `- zoom-out/  (~1 files)
|- .kiro/
|   |- agents/
|   |   |- aegis-orchestrator.json
|   |   |- builder.json
|   |   |- pitch.json
|   |   |- qa.json
|   |   `- security.json
|   |- settings/
|   |   `- mcp.json
|   |- skills/  (~0 files)
|   |   |- algorithmic-art/  (~4 files)
|   |   |- brainstorming/  (~8 files)
|   |   |- brand-guidelines/  (~2 files)
|   |   |- canvas-design/  (~83 files)
|   |   |- caveman/  (~1 files)
|   |   |- claude-api/  (~44 files)
|   |   |- deploy-to-vercel/  (~3 files)
|   |   |- diagnose/  (~2 files)
|   |   |- dispatching-parallel-agents/  (~1 files)
|   |   |- doc-coauthoring/  (~1 files)
|   |   |- docx/  (~61 files)
|   |   |- executing-plans/  (~1 files)
|   |   |- find-skills/  (~1 files)
|   |   |- finishing-a-development-branch/  (~1 files)
|   |   |- frontend-design/  (~2 files)
|   |   |- grill-me/  (~1 files)
|   |   |- grill-with-docs/  (~3 files)
|   |   |- handoff/  (~1 files)
|   |   |- improve-codebase-architecture/  (~4 files)
|   |   |- internal-comms/  (~6 files)
|   |   |- mcp-builder/  (~10 files)
|   |   |- next-best-practices/  (~20 files)
|   |   |- next-cache-components/  (~1 files)
|   |   |- next-upgrade/  (~1 files)
|   |   |- pdf/  (~12 files)
|   |   |- pptx/  (~59 files)
|   |   |- prototype/  (~3 files)
|   |   |- receiving-code-review/  (~1 files)
|   |   |- requesting-code-review/  (~2 files)
|   |   |- setup-matt-pocock-skills/  (~6 files)
|   |   |- shadcn/  (~13 files)
|   |   |- skill-creator/  (~18 files)
|   |   |- slack-gif-creator/  (~7 files)
|   |   |- subagent-driven-development/  (~4 files)
|   |   |- supabase/  (~3 files)
|   |   |- supabase-postgres-best-practices/  (~35 files)
|   |   |- systematic-debugging/  (~11 files)
|   |   |- tdd/  (~6 files)
|   |   |- template-skill/  (~1 files)
|   |   |- test-driven-development/  (~2 files)
|   |   |- theme-factory/  (~13 files)
|   |   |- to-issues/  (~1 files)
|   |   |- to-prd/  (~1 files)
|   |   |- triage/  (~3 files)
|   |   |- using-git-worktrees/  (~1 files)
|   |   |- using-superpowers/  (~4 files)
|   |   |- vercel-cli-with-tokens/  (~1 files)
|   |   |- vercel-composition-patterns/  (~14 files)
|   |   |- vercel-react-best-practices/  (~76 files)
|   |   |- vercel-react-native-skills/  (~42 files)
|   |   |- vercel-react-view-transitions/  (~8 files)
|   |   |- verification-before-completion/  (~1 files)
|   |   |- web-artifacts-builder/  (~5 files)
|   |   |- web-design-guidelines/  (~1 files)
|   |   |- webapp-testing/  (~6 files)
|   |   |- write-a-skill/  (~1 files)
|   |   |- writing-plans/  (~2 files)
|   |   |- writing-skills/  (~7 files)
|   |   |- xlsx/  (~54 files)
|   |   `- zoom-out/  (~1 files)
|   |- steering/
|   |   |- aegis-product.md
|   |   |- hackathon.md
|   |   |- product.md
|   |   `- tech.md
|   `- mcp.json
|- .skills/  (~74 files)
|   |- adapter-layer/  (~3 files)
|   |- ai-analysis/  (~3 files)
|   |- approval-risk/  (~3 files)
|   |- base-sepolia-deploy/  (~3 files)
|   |- chainlink-price/  (~3 files)
|   |- docker-dev/  (~3 files)
|   |- grill-me/  (~3 files)
|   |- handoff/  (~3 files)
|   |- hermes-kiro-runtime/  (~3 files)
|   |- improve-codebase-architecture/  (~3 files)
|   |- opensrc-research/  (~3 files)
|   |- opsrisk-dashboard/  (~3 files)
|   |- policy-engine/  (~3 files)
|   |- preflight-decoder/  (~3 files)
|   |- prototype/  (~3 files)
|   |- qa-demo/  (~3 files)
|   |- rpc-gateway/  (~3 files)
|   |- simulation/  (~3 files)
|   |- smart-contract-registry/  (~3 files)
|   |- systematic-debugging/  (~3 files)
|   |- tdd/  (~3 files)
|   |- to-issues/  (~3 files)
|   |- to-prd/  (~3 files)
|   |- vercel-deploy/  (~3 files)
|   |- README.md
|   `- registry.json
```
