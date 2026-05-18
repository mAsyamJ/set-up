# 15 Demo Script

## 10 second pitch

Aegis RPC screens Web3 transactions before broadcast.

## 30 second pitch

Every Web3 transaction passes through RPC, but normal RPC forwards blindly. Aegis turns that path into a programmable checkpoint that decodes transactions, checks deterministic policies, collects adapter signals, and returns SAFE, WARN, or BLOCK before broadcast.

## Live demo

### 1. RPC passthrough

Show `/api/rpc` with `eth_blockNumber`.

Say:
> Aegis behaves like real middleware. Read-only calls pass through.

### 2. Agent policy cap

Submit high-value agent action.

Say:
> The agent tries to execute beyond policy. Aegis blocks before broadcast.

### 3. Unlimited approval

Submit `approve(unknownSpender, MaxUint256)`.

Say:
> This is the classic drainer pattern. Aegis decodes calldata and blocks it.

### 4. Chainlink context

Show live price/freshness signal.

Say:
> Chainlink is not the product. It is one adapter signal feeding policy.

### 5. Dashboard

Show timeline and AI memo.

Say:
> This is the OpsRisk surface. Every decision is auditable.

### 6. Business

Say:
> We start as Security RPC and preflight API, expand into OpsRisk Cloud, then managed execution infrastructure.
