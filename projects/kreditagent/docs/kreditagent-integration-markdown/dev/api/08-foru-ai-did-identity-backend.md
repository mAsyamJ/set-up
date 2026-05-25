# 08 — ForU AI-DID and Identity Backend

## Goal

ForU AI-DID should become the user-facing identity bridge, while ERC-8004 remains the protocol trust anchor.

```text
ForU AI-DID = user/borrower identity and reputation surface
ERC-8004 Agent ID = on-chain agent identity and trust history
KreditAgent backend = consent, scoring, attestation, validation workflow
```

## Current integration assumption

Public ForU docs describe AI-DID / Identifi reputation concepts, but a public developer API for programmatically issuing/reading AI-DID and Identifi Score may not be available. Therefore:

- build a clean internal abstraction now;
- mock the provider during hackathon;
- replace with official ForU API once available.

## Data model

```prisma
model ForuIdentityBinding {
  id             String @id @default(cuid())
  borrowerId      String
  foruDid         String
  borrowerAgentRef String?
  status          ForuBindingStatus @default(PENDING)
  verificationHash String?
  linkedAt        DateTime?
  revokedAt       DateTime?
  createdAt       DateTime @default(now())

  @@unique([foruDid])
  @@index([borrowerId])
}

enum ForuBindingStatus {
  PENDING
  ACTIVE
  REVOKED
  FAILED
}

model ForuReputationExport {
  id             String @id @default(cuid())
  borrowerId      String
  foruDid         String
  component       String
  value           Json
  valueHash       String
  attestationId   String?
  status          ExportStatus @default(PENDING)
  exportedAt      DateTime?
  createdAt       DateTime @default(now())
}

enum ExportStatus {
  PENDING
  EXPORTED
  FAILED
  REVOKED
}
```

## Backend provider interface

```ts
interface ForuProvider {
  resolveDid(did: string): Promise<ForuProfile | null>;

  bindBorrower(input: {
    borrowerId: string;
    foruDid: string;
    borrowerAgentRef: string;
    consentReceiptHash: string;
  }): Promise<{ verificationHash: string }>;

  exportReputationComponent(input: {
    foruDid: string;
    component: "business_credit_reliability";
    value: BusinessCreditReliabilityComponent;
    evidenceHash: string;
    expiresAt: string;
  }): Promise<{ exportId: string; valueHash: string }>;

  revokeExport(input: {
    foruDid: string;
    exportId: string;
    reason: string;
  }): Promise<void>;
}
```

## Mock provider

The mock provider should:

- accept DID strings matching `did:foru:*`;
- generate deterministic `verificationHash`;
- store exported reputation locally;
- return mock profile status;
- mark all responses with `providerMode: "mock"`.

This lets the frontend show ForU integration without falsely claiming official API access.

## Business credit reliability component

```ts
type BusinessCreditReliabilityComponent = {
  version: "kreditagent-business-credit-v0.1";
  scoreBand: "A" | "B" | "C" | "D" | "E";
  validationStatus: "not_requested" | "pending" | "passed" | "failed";
  repaymentReputation: {
    onTimeRepaymentCount: number;
    lateRepaymentCount: number;
    defaultCount: number;
    disputeCount: number;
  };
  dataFreshnessDays: number;
  evidenceHash: `0x${string}`;
  expiresAt: string;
};
```

## API endpoints

### `POST /v1/borrowers/{borrowerId}/foru/bind`

Request:

```json
{
  "foruDid": "did:foru:bu-siti",
  "borrowerAgentRef": "eip155:84532:0xIdentityRegistry:42",
  "consentId": "con_..."
}
```

Response:

```json
{
  "bindingId": "fid_...",
  "status": "ACTIVE",
  "verificationHash": "0x...",
  "providerMode": "mock"
}
```

### `POST /v1/borrowers/{borrowerId}/foru/export-credit-reputation`

Request:

```json
{
  "attestationId": "att_...",
  "component": "business_credit_reliability"
}
```

Response:

```json
{
  "exportId": "foru_exp_...",
  "component": "business_credit_reliability",
  "valueHash": "0x...",
  "providerMode": "mock"
}
```

### `POST /v1/foru/exports/{exportId}/revoke`

Response:

```json
{
  "exportId": "foru_exp_...",
  "status": "REVOKED"
}
```

## Privacy rules

ForU should receive:

- ForU DID;
- score band;
- validation status;
- reputation summary;
- evidence hash;
- expiry;
- link/reference to KreditAgent attestation.

ForU should not receive by default:

- raw QRIS data;
- raw marketplace orders;
- borrower phone/address/KTP;
- full lender memo;
- lender internal decisions;
- detailed cashflow rows.

## AgentURI integration

When generating ERC-8004 agent metadata:

```json
{
  "foru": {
    "aiDid": "did:foru:bu-siti",
    "identifiComponent": "business_credit_reliability",
    "bindingHash": "0x..."
  }
}
```

## Failure modes

| Failure | Backend behavior |
|---|---|
| ForU API unavailable | Store pending export and retry; show `providerMode: unavailable`. |
| DID invalid | Reject with `FORU_DID_INVALID`. |
| Consent revoked | Revoke/expire local ForU export where possible. |
| Score expired | Do not export; require score refresh. |
| Official API absent | Use mock provider and label clearly. |

## Demo story

1. Borrower enters `did:foru:bu-siti`.
2. Backend binds DID to BorrowerAgent.
3. Score is generated and attested.
4. Backend exports `business_credit_reliability` component.
5. Frontend shows: “ForU Identifi component updated — mock provider mode.”
