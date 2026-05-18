# 00 Product Brief

## One-liner

Aegis RPC screens Web3 transactions before broadcast.

## Technical sentence

Aegis RPC is a JSON-RPC-compatible security gateway and preflight API that decodes transaction intent, evaluates deterministic policy templates, collects adapter signals, and returns `SAFE`, `WARN`, or `BLOCK` before a transaction is broadcast.

## What Aegis is

- Pre-broadcast transaction screening gateway
- Security RPC layer
- Preflight API
- Deterministic policy engine
- Adapter-based risk signal system
- OpsRisk audit dashboard
- On-chain policy commitment registry
- Future Security RPC SaaS and OpsRisk Cloud

## What Aegis is not

- Not a Chainlink product
- Not only Agent RPC
- Not only a dashboard
- Not a full RPC node in MVP
- Not a universal exploit detector
- Not a replacement for Forta, Defender, Tenderly, Hypernative, Blowfish, or Flashbots

## MVP customer wedge

| Customer | First use case |
|---|---|
| AI-agent platforms | Prevent agent actions outside budget or allowlist |
| DeFi backends | Guard keepers, rebalancers, liquidation bots |
| RWA/treasury operators | Enforce operator policy before high-value moves |
| Wallet vendors | Pre-signing safety API |
| Protocol backends | Safer admin and keeper execution |

## Hackathon demo thesis

The demo must prove:

1. Aegis behaves like real RPC middleware.
2. Aegis can block a wallet-drainer pattern before broadcast.
3. Aegis can use live adapter data such as Chainlink price freshness.
4. Aegis logs decisions with decoded intent, signals, verdict, and AI memo.
5. Aegis can become a real infrastructure business.
