# 11 Frontend Plan

## Pages

| Page | Purpose | Must-have |
|---|---|---|
| `/` | Landing and overview | hero, architecture, demo links |
| `/demo/agent` | lead demo | agent policy cap and Chainlink signal |
| `/demo/wallet` | approval blocker | MaxUint256 approval block |
| `/dashboard` | OpsRisk proof | event timeline, verdicts, signals, AI memo |
| `/demo/defi` | stretch | swap context |
| `/demo/rwa` | stretch | treasury action |

## Components

- AppShell
- Sidebar
- RpcStatusCard
- PreflightForm
- DemoScenarioSelector
- VerdictCard
- VerdictBadge
- AdapterSignalCard
- RiskChecksTable
- EventTimeline
- AiMemoPanel
- PolicyTemplateCard
- PolicyModeToggle
- PreSigningAssistPanel
- ContractAddressCard

## UI principles

- Make the verdict impossible to miss.
- Make decoded calldata readable.
- Show “AI explains, policy decides.”
- Show Base Sepolia and Vercel proof.
- Use clear demo scenario buttons.
