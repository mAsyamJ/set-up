# 18 — Do Not Build Yet

Hard guardrails. Each item is forbidden in Product 1, with the explicit condition under
which it becomes allowed. If you're reaching for any of these during the 14 days, you're
off-plan.

## Forbidden in Product 1

| Forbidden now | Why it's forbidden | When it becomes allowed |
|---------------|--------------------|--------------------------|
| **Flashloan arbitrage / executor** | Combining CoW scoring with live arbitrage execution stacks two hard problems and reintroduces funds + contract risk. Generic public flashloan arb is also the weakest solo-PnL bet per the prior research. | **Future Product 4 (Flashloan Arbitrage Feasibility Engine)** — and only as a *simulation/feasibility* module that reuses Product 2/3 sim + routing, Balancer (0% fee) first, Aave (5 bps) second. Never as Product 1. |
| **OEV / SVR watcher** | Different data sources, different validation; not CoW. | **Product 2**, after Product 1's gate passes and you've decided OEV is the PnL path. |
| **MEV-Share backrun scanner** | Different stream (SSE hints), different sim model. | **Product 3**, after Product 2. |
| **Uniswap v4 hook scanner** | Frontier research, not first PnL; unrelated to CoW shadow. | **Product 5**, research-track only. |
| **Web dashboard** | Front-end maintenance cost; CLI + Prometheus + Telegram already cover monitoring. | Only if a real audience needs it post-validation; never in the 14 days. |
| **Smart contracts** | We submit nothing on-chain in P1. | Only when a product actually executes on-chain (Product 4 feasibility may *model* contracts; deploying is later still). |
| **AI/agent layer** | Pure scope inflation; nothing here needs an LLM in the loop. | Not planned. Revisit only with a concrete, measured need. |
| **Generic "strategy framework" / `trait Strategy`** | Abstraction with one implementation is fiction and will fit no real second case. | When a *second* product exists and genuinely shares the interface — design it from two real cases, not zero. |
| **Extra crates** (`pnl`, `risk`, `routing`, `quoting`, `scoring`, `reporting`, `config`, `telemetry` as separate crates) | Premature factoring; guesses boundaries wrong. | `pnl`+`risk` with Product 2; `routing`+`quoting` with Product 3's second consumer; `reporting` when ≥2 products share a format; `config`/`telemetry` stay merged in `core`. |
| **Empty future folders** (`apps/oev-*`, etc.) | A lie about what exists; invites drift. | When the product is actually being built. |
| **Uniswap v3/v4, Balancer, Curve routing** | Scope control; v2 + CoW `/quote` is enough to get a first competitiveness signal. | Day-14 decision, only if coverage data shows v2 misses material orderflow. |
| **Live solver submission / onboarding / bonding** | Capital-prohibitive ($500K + 1.5M COW full; $50K→$100K + 500K→1M COW reduced) and unjustified pre-evidence. | Only if Product 1's win-rate is compelling vs the bond — a post-Day-14 capital decision. |

## The one-sentence test

Before adding anything, ask: *"Does this help answer 'can my Rust shadow solver reproduce
real CoW scoring and score competitively against settled auctions?'"* If not, it's
forbidden until a later product.

## Flashloan, specifically (since it keeps coming up)

Flashloans are a **capital primitive for a later execution product**, not part of a
read-only scoring validator. They appear in this pack only here and as a Product-4
roadmap note. Do not let "but flashloans are cheap/free on Balancer" pull execution logic
into Product 1 — Product 1 never executes anything. The right place for flashloan work is
Product 4, reusing the routing and simulation infrastructure that Products 2–3 will have
already built and proven.
