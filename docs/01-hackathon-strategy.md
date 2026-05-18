# 01 Hackathon Strategy

## Judging criteria target

| Criterion | Weight | Aegis proof |
|---|---:|---|
| Originality | 30% | RPC as programmable pre-broadcast checkpoint |
| Problem-Solving | 30% | Blocks dangerous approvals and out-of-policy agent actions before broadcast |
| Completeness | 20% | Working Vercel app, API routes, Base Sepolia contracts, dashboard |
| Scalability | 20% | Security RPC SaaS, OpsRisk Cloud, Managed Gateway, IaaS roadmap |

## Demo priority

1. `eth_blockNumber` or `eth_getBalance` passthrough.
2. `approve(unknownSpender, MaxUint256)` becomes `BLOCK`.
3. High-value transaction with Chainlink price signal becomes `WARN` or `BLOCK`.
4. Dashboard shows event, adapter signals, policy, AI memo.
5. Policy hash is registered on Base Sepolia.

## Winning narrative

Existing tools either sit inside consumer wallets or monitor after broadcast. Aegis sits between an organization’s signer and the chain, the only point where automated transactions can still be stopped before they cost money.

## Credibility rules

- Admit the MVP is a wrapped gateway, not a full RPC node.
- Do not claim all phishing can be stopped if user chooses hostile RPC.
- Do not make AI the enforcement layer.
- Show real API calls and real Base Sepolia addresses.
