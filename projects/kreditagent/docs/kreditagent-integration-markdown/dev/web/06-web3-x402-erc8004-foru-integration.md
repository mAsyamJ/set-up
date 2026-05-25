# 06 — Web3, x402, ERC-8004, and ForU Integration

## Integration thesis

The frontend should make the protocol stack understandable:

```text
ForU AI-DID = user-facing identity/reputation surface
ERC-8004 = agent identity, reputation, validation trust layer
x402/Base = paid machine-to-machine attestation rail
KreditAgent API = deterministic score and attestation service
```

## Chain strategy

Recommended hackathon setup:

| Layer | Network |
|---|---|
| x402 payment | Base Sepolia (`eip155:84532`) |
| ERC-8004 demo contracts | Base Sepolia if possible; Sepolia acceptable if already deployed |
| Wallet UI | Base Sepolia default |
| Mock mode | local no-chain fallback |

Base Sepolia keeps the x402 story clean because x402 docs explicitly support Base Sepolia for testnet demos.

## Wallet integration

Use RainbowKit + wagmi + viem.

Frontend responsibilities:

- connect wallet;
- show address;
- show network;
- switch to Base Sepolia;
- call contract reads;
- submit contract writes only when user explicitly chooses wallet mode;
- never store private keys in browser;
- never expose backend relayer private keys.

## Wallet UX states

| State | UI |
|---|---|
| disconnected | `Connect wallet` button |
| connected correct chain | show address + chain badge |
| connected wrong chain | show `Switch to Base Sepolia` CTA |
| unsupported wallet | show wallet support copy |
| transaction pending | show hash and block explorer link |
| transaction failed | show revert reason if available |

## Chain config example

```ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia, base, sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "KreditAgent",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [baseSepolia, sepolia, base],
  ssr: true,
});
```

## ERC-8004 frontend responsibilities

### Read actions

The frontend should read/display:

- agent owner;
- agent URI;
- agent active status;
- agent role metadata;
- reputation event list;
- validation request/result status;
- attestation hash metadata.

### Write actions

For hackathon, writes can be backend-relayed or wallet-signed depending demo needs.

Write actions:

- register demo agent;
- publish attestation;
- request validation;
- submit validation result;
- post reputation event;
- open dispute.

### UI rule

If a transaction is backend-relayed, the UI must label it:

> Submitted by KreditAgent worker for demo convenience.

If wallet-signed, label it:

> You are signing this action as the connected agent owner.

## ERC-8004 object model in UI

### Agent profile

```ts
export type AgentProfile = {
  agentRegistry: string;
  agentId: string;
  owner: `0x${string}`;
  agentWallet?: `0x${string}`;
  agentURI: string;
  role: "borrower" | "issuer" | "lender" | "validator" | "regulator_viewer";
  active: boolean;
  metadata?: Record<string, unknown>;
};
```

### Agent card display

```text
BorrowerAgent #42
Owner: 0x1234...abcd
Role: MSME Borrower
ForU DID: did:foru:bu-siti-demo
Reputation events: 3
Validation references: 1
```

## agentURI rendering

The frontend should parse and display selected fields from `agentURI`, but never trust it blindly.

Use `agentURI` as metadata, not authorization.

Display:

- name;
- description;
- endpoints;
- supported trust modes;
- x402 support;
- ForU DID binding;
- update timestamp.

Warn if:

- malformed JSON;
- endpoint domain not allowlisted in demo;
- unsupported payment network;
- missing trust fields.

## x402 frontend flow

The frontend should not hide the 402. For the hackathon, the `402 Payment Required` response is a product moment.

### Flow

1. Lender clicks `Request audit attestation`.
2. Frontend calls API.
3. API returns 402.
4. Frontend displays payment terms.
5. Lender clicks `Pay with x402`.
6. x402 client signs/settles payment.
7. Frontend retries request with payment proof.
8. API returns attestation.
9. Frontend records receipt state and updates trust timeline.

### UI payment details

Show:

- price;
- currency;
- chain;
- payee;
- facilitator;
- resource;
- expiry;
- receipt hash after payment;
- tx hash if available.

### Mock mode

In mock mode, preserve the same UX but clearly label:

> Demo x402 mock mode — no real funds move.

Do not hide mock mode in the UI. Judges appreciate reliability, but not deception.

## x402 client wrapper

```ts
export type PaidFetchOptions = {
  resource: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
};

export async function paidFetch<T>(opts: PaidFetchOptions): Promise<T> {
  const first = await fetch(opts.resource, {
    method: opts.method ?? "GET",
    headers: opts.headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (first.status !== 402) {
    return first.json();
  }

  const terms = await parsePaymentTerms(first);
  const proof = await createX402PaymentProof(terms);

  const second = await fetch(opts.resource, {
    method: opts.method ?? "GET",
    headers: {
      ...opts.headers,
      "PAYMENT-SIGNATURE": proof.signature,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!second.ok) throw new Error(`Paid request failed: ${second.status}`);
  return second.json();
}
```

## ForU AI-DID integration

### Current public-doc assumption

Public ForU docs describe AI-DID / portable identity / Identifi Score, but a stable public developer API for programmatic AI-DID issuance/Identifi writeback should not be assumed unless provided by organizers.

### Frontend modes

| Mode | Behavior |
|---|---|
| mock | show fake `did:foru:*` binding and demo Identifi component |
| connect | user clicks connect ForU; redirects/OAuth/API if provided |
| read-only | show imported DID and score component |
| unavailable | explain official API not configured |

### ForU identity card

Fields:

- ForU DID;
- Identifi score or component;
- business credit reliability component;
- last sync;
- sync status;
- privacy note.

### Data minimization copy

> ForU receives reputation components and verification status, not raw QRIS or e-commerce transaction rows.

## Contract read hooks

```ts
export function useAgent(agentId?: bigint) {
  return useReadContract({
    address: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY as `0x${string}`,
    abi: identityRegistryAbi,
    functionName: "getAgent",
    args: agentId ? [agentId] : undefined,
    query: { enabled: Boolean(agentId) },
  });
}
```

## Contract write hooks

```ts
export function usePublishAttestation() {
  return useWriteContract();
}
```

Use explicit preflight checks before writes:

```ts
const checks = [
  walletConnected,
  correctChain,
  consentActive,
  scoreUnexpired,
  hashesPresent,
  issuerConfigured,
];
```

Do not show transaction button as enabled until all checks pass.

## Proof link policy

Each confirmed protocol action should expose:

- internal detail page;
- explorer link;
- copyable hash;
- status badge.

Explorer base URLs:

| Network | Explorer |
|---|---|
| Base Sepolia | `https://sepolia.basescan.org/tx/{hash}` |
| Base mainnet | `https://basescan.org/tx/{hash}` |
| Sepolia | `https://sepolia.etherscan.io/tx/{hash}` |

## Security rules

The frontend must not:

- construct arbitrary payment recipient addresses from LLM output;
- accept arbitrary x402 payment terms without checking expected resource/price/payee/network;
- treat `agentURI` as trusted executable config;
- expose API secrets or private keys;
- store raw borrower CSV rows in localStorage;
- use demo mock receipts without mock labels;
- let a lender view audit-grade attestation if consent is revoked.

## Integration acceptance tests

- Wrong network blocks x402 payment.
- 402 response renders terms.
- Mock payment unlocks attestation in demo mode.
- Invalid payment proof renders retry.
- Replayed payment proof renders replay error.
- Revoked consent blocks paid attestation retrieval.
- Expired score renders regenerate CTA.
- ERC-8004 agentURI render survives malformed JSON.
- ForU unavailable mode does not break borrower flow.
