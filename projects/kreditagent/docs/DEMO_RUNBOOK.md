# Demo Runbook

## Terminal setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Optional contracts:

```bash
cd contracts
forge test
# Optional: export NETWORK_NAME=sepolia PROTOCOL_OWNER=0x... (owner defaults to deployer)
forge script script/DeployKreditProtocol.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

Deployment addresses are written to `contracts/deployments/<NETWORK_NAME>.json` (default `NETWORK_NAME` is `local` in the script). Add `--verify` and `ETHERSCAN_API_KEY` when needed; see [contracts/docs/DEPLOYMENT_RUNBOOK.md](../contracts/docs/DEPLOYMENT_RUNBOOK.md).

## Demo steps

1. Open web UI.
2. Click `Run borrower scoring`.
3. Show score, feature hash, evidence hash.
4. Click `Publish attestation`.
5. Show returned tx hash or mock chain event.
6. Switch to lender tab.
7. Click `Request audit attestation`.
8. Show first 402 response.
9. Click `Pay with LenderAgent`.
10. Show signed attestation response.
11. Click `Simulate repayment`.
12. Show reputation event.

## Backup

If chain/RPC fails, use mock chain mode and show the contract code + Foundry test file.
If LLM fails, narrative generator falls back to deterministic template.
If x402 fails, mock mode proves the 402/pay/retry flow.
