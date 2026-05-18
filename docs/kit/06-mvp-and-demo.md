# MVP scope and demo proof

Product steering: [.kiro/steering/aegis-product.md](../../.kiro/steering/aegis-product.md)  
Hackathon strategy: [.kiro/steering/hackathon.md](../../.kiro/steering/hackathon.md)

## What Aegis is

Aegis RPC is a programmable **Security RPC gateway** and transaction firewall — not only a dashboard or chatbot.

```txt
Transaction → Aegis RPC
  → decode → simulate → adapter signals
  → policy → SAFE / WARN / BLOCK
  → forward or reject → dashboard log
  → AI memo (explains facts; does not decide)
```

## Hackathon MVP modules

| # | Module |
|---|--------|
| 1 | JSON-RPC passthrough |
| 2 | Transaction interceptor / preflight API |
| 3 | Tx decoder (native transfer + ERC20 approve) |
| 4 | Policy engine |
| 5 | Adapter layer |
| 6 | Chainlink price/freshness adapter (or mock) |
| 7 | SAFE/WARN/BLOCK dashboard |
| 8 | AI memo panel |
| 9 | Base Sepolia proof |

Build order matches [.kiro/steering/aegis-product.md](../../.kiro/steering/aegis-product.md).

## Demo must prove

1. `eth_getBalance` or `eth_blockNumber` passthrough through Aegis RPC.
2. `POST /api/preflight` returns decoded transaction intent.
3. Native transfer below policy → **SAFE**.
4. High-value transfer → **BLOCK** before broadcast.
5. `approve(MaxUint256)` to unknown spender → **BLOCK**.
6. Adapter signal present (Chainlink or mocked freshness).
7. Dashboard: timeline, intent, signals, verdict, broadcast status.
8. AI memo cites deterministic facts only.

## Winning narrative (judges)

Optimize for: originality, problem-solving, completeness, scalability.

**One line:** Aegis prevents dangerous Web3 or AI-agent actions **before** execution.

## Do not overclaim

| Do not say | Say instead |
|------------|-------------|
| Prevents all hacks | Intercepts high-risk patterns in demo scope |
| Detects all zero-days | Deterministic policy on decoded intent |
| Replaces Chainlink | Uses Chainlink as first adapter |
| Replaces RPC providers | Wraps existing RPC providers |

## Tech stack (priority)

- Next.js App Router, TypeScript, Tailwind
- viem
- Local JSON / SQLite / Supabase later
- Base Sepolia target chain
- No Docker unless approved
- Smart contracts secondary (policy registry, feed consumer)

## Demo scenarios (suggested)

Document in app `README.md`:

| Scenario | Input | Expected verdict |
|----------|-------|------------------|
| Small native transfer | Low value ETH send | SAFE |
| Large native transfer | Above policy threshold | BLOCK |
| Unlimited approve | ERC20 approve max to unknown | BLOCK |
| Read-only RPC | `eth_blockNumber` | Passthrough OK |

## AI collaboration (judging)

Required artifacts:

- [docs/AI_COLLABORATION_LOG.md](templates/AI_COLLABORATION_LOG.md) in app repo
- Git `Co-authored-by` on AI-assisted commits — [05-ai-collaboration.md](05-ai-collaboration.md)

## Related

- [04-hackathon-lifecycle.md](04-hackathon-lifecycle.md)
- [03-kiro-agents.md](03-kiro-agents.md)
