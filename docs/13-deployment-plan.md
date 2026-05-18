# 13 Deployment Plan

## Vercel

1. Push repo to GitHub.
2. Import app in Vercel.
3. Set root directory to `apps/web` if monorepo.
4. Add env vars.
5. Deploy.
6. Test `/api/rpc` and `/api/preflight`.

## Base Sepolia

1. Fund deployer wallet.
2. Configure `.env`.
3. Run Foundry tests.
4. Deploy registry, feed consumer, demo token, demo spender.
5. Save addresses to `contracts/deployments/base-sepolia.json`.
6. Copy addresses to app env.

## Hermes/Kiro runtime

This runtime supports development and orchestration. It is not needed by end users.

Expected services:

```bash
systemctl --user list-units --type=service | grep -Ei "kiro|hermes|gateway"
```

Expected:

```text
hermes-gateway.service
kiro-openai-bridge.service
```
