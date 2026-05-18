# 03 Repository Structure

## Target repo

```text
aegis-rpc/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── page.tsx
│       │   ├── dashboard/page.tsx
│       │   ├── demo/wallet/page.tsx
│       │   ├── demo/agent/page.tsx
│       │   ├── demo/defi/page.tsx
│       │   ├── demo/rwa/page.tsx
│       │   └── api/
│       │       ├── rpc/route.ts
│       │       ├── preflight/route.ts
│       │       ├── safe-send/route.ts
│       │       ├── events/route.ts
│       │       ├── policies/route.ts
│       │       ├── adapters/chainlink/route.ts
│       │       └── ai-memo/route.ts
│       ├── components/
│       ├── lib/
│       │   ├── rpc/
│       │   ├── engine/
│       │   ├── adapters/
│       │   ├── policies/
│       │   ├── chain/
│       │   ├── db/
│       │   └── ai/
│       └── package.json
├── contracts/
│   ├── src/
│   ├── script/
│   ├── test/
│   └── deployments/
├── packages/
│   ├── shared/
│   └── sdk/
├── docker/
├── docs/
├── scripts/
├── tests/
├── docker-compose.yml
├── .env.example
├── AGENTS.md
├── ORCHESTRATOR.md
├── DECISIONS.md
└── README.md
```

## Folder owners

| Folder | Owner agent | Priority |
|---|---|---|
| `apps/web/app/api/rpc` | Backend RPC Agent | MUST |
| `apps/web/app/api/preflight` | Backend RPC Agent | MUST |
| `apps/web/lib/engine` | Policy Engine Agent | MUST |
| `apps/web/lib/adapters` | Adapter Agent | MUST |
| `apps/web/lib/db` | Database Agent | MUST |
| `apps/web/lib/ai` | AI Memo Agent | SHOULD |
| `apps/web/app/dashboard` | Frontend Dashboard Agent | MUST |
| `contracts` | Smart Contract Agent | SHOULD/MUST for policy registry |
| `tests` | QA Agent | MUST |
| `docs` | Pitch/Orchestrator Agent | MUST |
