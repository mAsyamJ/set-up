Below is a stronger landing page copy for **Aegis RPC**. I changed the positioning from “tool demo” into **security infrastructure / transaction firewall / OpsRisk control plane**, based on your product thesis: Aegis sits between wallets/agents/apps and RPC, decodes intent, checks policy/adapters, then returns **SAFE / WARN / BLOCK before broadcast** . The copy also keeps the important rule: **AI explains, deterministic policy decides** .

---

# Landing Page Copy — Aegis RPC

## Hero

**base-sepolia · overview · v0.1**

# Stop unsafe Web3 transactions before they reach the chain.

Aegis RPC is a programmable transaction firewall for wallets, AI agents, DeFi apps, treasuries, and protocol backends.

It wraps your existing RPC, decodes transaction intent, checks deterministic policy, reads adapter signals, and returns **SAFE**, **WARN**, or **BLOCK** before broadcast.

**AI explains the risk. Policy makes the decision.**

**Primary CTA:**
Run agent demo

**Secondary CTA:**
Open OpsRisk dashboard

**Tertiary CTA:**
Try wallet firewall

---

## Hero Trust Strip

**Programmable screening before broadcast**
Decode calldata, simulate intent, enforce policy, and log every decision.

**Built for automated execution**
Guardrails for AI agents, protocol bots, DeFi workflows, and treasury operators.

**RPC-compatible by design**
Read calls pass through. Risky transaction calls are screened before they are forwarded.

---

## Three-Step Product Flow

### 01 — Decode

Turn opaque calldata into readable transaction intent.

Aegis extracts the target contract, function selector, value, spender, approval amount, sender, chain, and method before anything is broadcast.

### 02 — Check

Run deterministic policy with real adapter signals.

Aegis checks allowlists, spend limits, approval risk, contract code, simulation results, Chainlink price/freshness data, and future external risk adapters.

### 03 — Decide

Return **SAFE**, **WARN**, or **BLOCK**.

Safe transactions are forwarded. Suspicious transactions require attention. Blocked transactions never reach the chain.

---

## Diagram Labels / Flow Section

**Signer**
Wallet, AI agent, dApp, treasury operator, or protocol backend.

**Aegis RPC**
JSON-RPC-compatible gateway that routes read calls and screens transaction calls.

**Decoder**
Extracts transaction intent from calldata, selectors, value, spender, and target.

**Adapters**
Reads external and internal signals: price, freshness, contract code, allowlists, approval risk, and threat data.

**Policy Engine**
Applies deterministic rules for wallet, agent, DeFi, RWA, treasury, or backend workflows.

**Verdict**
SAFE, WARN, or BLOCK before broadcast.

**Audit Log**
Stores decoded intent, signals, verdict, broadcast status, latency, and AI memo.

---

## Judge Demo Section

# Try it in 60 seconds

A guided demo showing the exact risk loop Aegis protects.

### Step 1 — BLOCK over-cap agent transaction

An AI agent attempts a transaction above its configured USD limit.
Aegis reads adapter signals, calculates risk, and blocks before broadcast.

### Step 2 — WARN unknown selector

A transaction calls an unknown or unapproved function selector.
Aegis warns the operator and generates a readable risk memo.

### Step 3 — AI assist

AI summarizes what happened, why the policy reacted, and what the user should review.
The AI never decides the verdict.

### Step 4 — SAFE send

A compliant transaction passes policy and is forwarded through the underlying RPC.

**CTA:**
Start demo

---

## Overview / Dashboard Section

# Gateway at a glance

Live screening stats from the Aegis audit log.

Every transaction decision is recorded with decoded calldata, policy result, adapter signals, broadcast status, latency, and AI explanation.

**Policy decides. AI explains. Audit log proves.**

**Dashboard CTA:**
Open full OpsRisk dashboard

---

## Metrics Cards Copy

**Screenings**
Total requests screened by Aegis RPC.

**SAFE**
Transactions forwarded after passing policy.

**WARN**
Suspicious actions that need review before execution.

**BLOCK**
Transactions rejected before broadcast.

**Average latency**
Time added by screening pipeline.

**RPC health**
Underlying RPC response status and passthrough latency.

---

## “What Aegis Stops Today” Section

# What Aegis stops, today

### BLOCK — Approval drainer blocked

A user attempts an unlimited ERC-20 approval to an unknown spender.

Aegis decodes `approve(spender, MaxUint256)`, checks spender policy, detects approval risk, and blocks before signing or broadcast.

### BLOCK — Agent over-spend blocked

An AI agent tries to execute above its allowed transaction budget.

Aegis calculates the USD value using adapter signals and rejects the action before funds move.

### WARN — Unknown contract interaction

A transaction targets an unverified or unfamiliar contract.

Aegis warns the user, records the risk context, and asks for manual review.

### WARN — Suspicious DeFi action

A swap, rebalance, borrow, repay, or liquidation appears outside the configured risk threshold.

Aegis flags the action using policy templates and adapter signals.

### SAFE — Normal transaction forwarded

A compliant transaction passes decoding, simulation, adapter checks, and policy.

Aegis forwards it to the underlying RPC and records the proof.

---

## Customer Profiles Section

# One gateway. Many signer profiles.

### AI agents

Give autonomous agents hard execution boundaries.

Use Aegis for agent allowlists, contract permissions, function selector limits, max USD action size, daily spend caps, and stale-data blocks.

### Wallets

Protect users before they sign dangerous transactions.

Block unlimited approvals, warn on unknown spenders, detect abnormal value transfers, and explain calldata in plain language.

### DeFi bots

Add a reusable risk layer to automated DeFi execution.

Check swap deviation, stale price feeds, contract targets, simulation results, and strategy-specific policy rules.

### Treasuries

Enforce operational controls before money moves.

Use recipient allowlists, transfer caps, manual approval warnings, audit logs, policy history, and incident timelines.

### Protocol backends

Stop rebuilding custom transaction checks.

Route backend transactions through Aegis for shared policy enforcement, monitoring, and RiskOps logging.

### RWA workflows

Add preflight controls to mint, redeem, transfer, and operator actions.

Use policy templates for approved operators, value limits, asset-specific rules, price/NAV freshness, and audit exports.

---

## OpsRisk Section

# From RPC gateway to OpsRisk control plane

Aegis does not stop at blocking transactions.

Every screening event becomes an operational record: who initiated the action, what the transaction intended to do, which signals were checked, why the verdict happened, whether it was broadcast, and what the AI memo explained.

This turns transaction security into a daily workflow for teams.

**OpsRisk includes:**

Policy templates
Audit logs
Incident timelines
Adapter signals
Approval queues
Risk memos
Monitoring dashboards
Team accountability

**CTA:**
View OpsRisk dashboard

---

## Technical Section

# Built as infrastructure, not a wallet plugin

Aegis RPC is designed as a modular security gateway.

Read-only RPC methods pass through normally. High-risk transaction methods are intercepted, decoded, simulated, enriched with adapter signals, evaluated by policy, and only forwarded when safe.

**Core modules:**

RPC Gateway
Transaction Decoder
Simulation Engine
Policy Engine
Adapter Layer
Verdict Engine
AI Memo Service
OpsRisk Dashboard
Policy Registry

This makes Aegis usable by wallets, AI agents, apps, backend services, and institutions without forcing them to rebuild their execution stack.

---

## Adapter Section

# Adapter signals make policy smarter

Aegis can plug into multiple signal sources.

For the hackathon version, Chainlink is used as the first real-data adapter for price and freshness context. But Aegis is not a Chainlink app. Chainlink is one adapter inside a broader Security RPC and OpsRisk infrastructure layer.

**Current adapters**

Chainlink price/freshness adapter
Contract code adapter
Approval risk adapter
Allowlist adapter
Agent policy adapter

**Future adapters**

Threat intelligence
Simulation providers
Compliance feeds
Proof-of-reserve feeds
Sequencer uptime
Protocol-specific risk models

---

## Positioning Section

# The RPC layer should not be a blind pipe.

Web3 execution is becoming automated, high-value, and agent-driven.

But most RPC infrastructure still forwards transactions without understanding intent, policy, approval risk, or operational context.

Aegis turns the RPC path into the earliest practical enforcement point for transaction safety.

Before signing.
Before broadcast.
Before irreversible execution.

---

## Business / Roadmap Section

# Security RPC today. OpsRisk infrastructure tomorrow.

Aegis starts as a wrapped RPC and preflight API.

Then it expands into a full OpsRisk Cloud: monitoring, alerts, policy consoles, audit exports, approval queues, and managed execution gateways.

Long term, Aegis becomes security-optimized RPC infrastructure for teams that need safer automated execution.

**Phase 0**
Hackathon wrapped RPC and demo dashboard.

**Phase 1**
Hosted Security RPC and preflight API.

**Phase 2**
OpsRisk Cloud with monitoring, alerts, and audit logs.

**Phase 3**
Managed policy-enforced execution gateway.

**Phase 4**
Dedicated security RPC infrastructure and simulation workers.

**Phase 5**
Adapter marketplace and shared risk-signal network.

---

## Final CTA Section

# Add a security checkpoint before your next transaction.

Aegis RPC screens Web3 transactions before they reach the chain.

Use it for wallets, agents, DeFi bots, treasuries, RWA workflows, and backend automation.

**Primary CTA:**
Run the live demo

**Secondary CTA:**
Open OpsRisk dashboard

**Developer CTA:**
Call the preflight API

---

## Shorter Hero Alternative

# Your programmable firewall before Web3 transactions go on-chain.

Aegis RPC wraps your existing RPC and screens risky transactions before broadcast.

It decodes calldata, simulates intent, checks policy, reads adapter signals, and returns **SAFE**, **WARN**, or **BLOCK**.

Built for AI agents, wallets, DeFi bots, treasuries, RWA workflows, and protocol backends.

**AI explains. Policy decides. Aegis blocks before execution.**
