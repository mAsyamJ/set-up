# Aegis Protocol / Aegis RPC Product Steering

Aegis RPC is a programmable Security RPC gateway and OpsRisk infrastructure layer.

The product is NOT:
- only a dashboard
- only Chainlink
- only a textarea risk checker
- only a chatbot
- only a fake contract scanner

The product IS:
- JSON-RPC compatible gateway
- read-only RPC passthrough
- transaction preflight endpoint
- transaction decoder
- deterministic policy engine
- adapter layer
- SAFE / WARN / BLOCK verdict engine
- RiskOps dashboard
- AI memo after deterministic verdict only

Hackathon demo must prove:
1. eth_getBalance or eth_blockNumber passthrough through Aegis RPC
2. POST /api/preflight returns decoded transaction intent
3. native transfer below policy returns SAFE
4. high-value transfer returns BLOCK before broadcast
5. ERC20 approve(MaxUint256) to unknown spender returns BLOCK
6. adapter signal exists, starting with mocked/real Chainlink price freshness
7. dashboard shows request timeline, decoded intent, adapter signals, verdict, and broadcasted status
8. AI memo explains facts only and does not make the decision

Priority stack:
- Next.js App Router
- TypeScript
- Tailwind
- viem
- local JSON storage or SQLite/Supabase later
- Base Sepolia as target chain

Build order:
1. Next.js app
2. /api/rpc passthrough
3. /api/preflight
4. transaction decoder
5. policy engine
6. adapter interface
7. Chainlink/mock price adapter
8. RiskOps dashboard
9. AI memo
10. demo scenarios

Do not overbuild smart contracts first. Smart contracts are secondary proof:
- policy registry
- Chainlink feed consumer
- demo policy app
