# 03 — End-to-End User Workflows

## Workflow A — Public visitor to demo

### Goal

A judge or lender understands the product and starts the demo in under 20 seconds.

### Steps

1. User lands on `/`.
2. Hero says: “Portable credit reputation for Indonesian MSMEs.”
3. User sees three product primitives: QRIS/e-commerce evidence, ERC-8004 reputation, x402 paid attestation.
4. User clicks `Start 90-second demo`.
5. App opens `/borrower?borrower=bu-siti&step=consent`.

### Success criteria

- CTA visible above fold.
- No crypto jargon in first screen.
- “Not a lender” disclaimer visible but not dominant.

## Workflow B — Borrower onboarding and consent

### Actor

MSME borrower, e.g. Bu Siti.

### Goal

Grant scoped consent for KreditAgent to derive credit features from business evidence.

### Steps

1. Borrower opens `/borrower`.
2. UI shows profile card:
   - business name;
   - ForU AI-DID status;
   - BorrowerAgent ID;
   - current score status;
   - consent status.
3. Borrower goes to `/borrower/consent`.
4. UI shows consent scopes:
   - read QRIS transactions;
   - read e-commerce orders;
   - derive credit features;
   - share score band with eligible lenders;
   - share audit-grade attestation after x402 payment.
5. Borrower reviews purpose and expiry.
6. Borrower signs consent message or clicks demo grant.
7. UI shows consent receipt:
   - `consentId`;
   - scope list;
   - evidence source list;
   - expiry;
   - revocation CTA.

### Required UI states

| State | UI treatment |
|---|---|
| No consent | warning card + `Grant consent` CTA |
| Active consent | green/neutral badge + expiry date |
| Expiring soon | amber badge + renewal CTA |
| Revoked | red/gray badge + `Regenerate score unavailable` message |
| Expired | gray badge + `Renew consent` CTA |

### Safety copy

> You can revoke consent. Revocation blocks new attestations. Existing on-chain hashes cannot be deleted, but they do not contain raw transaction data.

## Workflow C — Evidence upload/linking

### Goal

Convert borrower data into normalized, auditable features.

### Steps

1. Borrower opens `/borrower/data`.
2. UI shows data-source cards:
   - QRIS CSV;
   - Tokopedia/Shopee orders;
   - repayment events;
   - optional wallet/bank mock.
3. Borrower uploads sample QRIS CSV.
4. Upload component validates file type/size.
5. API returns:
   - records accepted/rejected;
   - warnings;
   - evidence hash;
   - latest transaction date;
   - coverage days.
6. Borrower uploads e-commerce CSV.
7. Feature readiness indicator turns green.

### Data quality UI

| Warning | User-facing text |
|---|---|
| duplicate rows | “Some repeated rows were ignored.” |
| prompt-injection-like text | “Untrusted text was removed from scoring input.” |
| short history | “Score may be less reliable because evidence covers fewer than 30 days.” |
| stale data | “Latest transaction is older than recommended freshness window.” |
| merchant mismatch | “Business identity mismatch; manual review required.” |

### Important visual

Show a “data minimization” block:

```text
Raw rows → normalized summary → feature hash → score hash → on-chain commitment
```

## Workflow D — Generate deterministic score

### Goal

Show that KreditAgent can compute a lender-usable score without AI deciding credit.

### Steps

1. Borrower opens `/borrower/score`.
2. UI shows `Ready to score` if consent + data readiness pass.
3. Borrower clicks `Generate score`.
4. UI shows loading stepper:
   - normalize evidence;
   - calculate features;
   - apply scoring policy;
   - generate explanation;
   - create signed package.
5. UI displays score card:
   - score number;
   - score band;
   - positive factors;
   - risk factors;
   - score version;
   - evidence hash;
   - feature hash;
   - expiry.
6. UI displays explanation panel:
   - borrower summary;
   - lender memo;
   - manual review questions;
   - explicit “AI explanation only” disclaimer.

### Score card layout

```text
[742] [Band B — Lendable with monitoring]
Stable QRIS revenue     + High
Fulfillment rate        + Good
Platform diversification  Moderate
Repayment history         New borrower
Evidence coverage         92 days
```

### Critical warning

> KreditAgent does not approve loans. Licensed lenders make final credit decisions.

## Workflow E — Publish attestation to ERC-8004-style registry

### Goal

Link the score to an ERC-8004 borrower identity and KreditAgent issuer identity.

### Steps

1. Borrower clicks `Publish attestation`.
2. UI checks:
   - wallet connected;
   - correct chain;
   - consent active;
   - score unexpired;
   - score package signed.
3. If no wallet, prompt connect.
4. If wrong chain, prompt switch.
5. Contract write or backend relayer posts score hash/metadata.
6. UI shows transaction pending.
7. UI shows confirmed attestation:
   - `attestationId`;
   - tx hash;
   - borrower agent ID;
   - issuer agent ID;
   - score hash;
   - expiry;
   - validation status.

### Transaction state copy

| State | Copy |
|---|---|
| preparing | “Preparing attestation transaction.” |
| wallet pending | “Confirm transaction in your wallet.” |
| broadcast | “Transaction submitted. Waiting for confirmation.” |
| confirmed | “Credit attestation anchored.” |
| failed | “Attestation was not published. No lender can access audit-grade proof yet.” |

## Workflow F — Lender x402 paid attestation request

### Actor

Licensed lender or LenderAgent.

### Goal

Pay for an audit-grade attestation and receive signed score package.

### Steps

1. Lender opens `/lender/attestations`.
2. UI shows borrower search or prefilled `Bu Siti` fixture.
3. Lender clicks `Request audit-grade attestation`.
4. API returns `402 Payment Required`.
5. UI shows payment terms:
   - price;
   - network;
   - token;
   - payee;
   - resource path;
   - expiry;
   - purpose.
6. Lender clicks `Pay and retrieve`.
7. Wallet signs/payment flow executes.
8. Client retries attestation request with payment proof.
9. API returns attestation payload.
10. UI shows:
   - score;
   - validation status;
   - hashes;
   - x402 receipt hash;
   - policy flags;
   - underwriter memo.

### x402 UI states

| State | UI treatment |
|---|---|
| unpaid | price card + `Pay with x402` CTA |
| paying | spinner + payment details locked |
| paid pending retry | “Payment accepted, retrieving attestation.” |
| paid success | show attestation payload |
| invalid payment | error + retry terms |
| replayed receipt | error + generate new payment |
| facilitator offline | demo fallback notice |

## Workflow G — Validator review

### Goal

Make validation visible as independent trust, not just issuer self-claim.

### Steps

1. Lender or KreditAgent requests validation.
2. UI displays `Validation pending`.
3. ValidatorAgent recomputes score from approved evidence/feature hash.
4. Validation result posts:
   - pass;
   - fail;
   - disputed;
   - inconclusive.
5. UI updates attestation detail.

### Validation status copy

| Status | Copy |
|---|---|
| not_requested | “No independent validator has checked this score yet.” |
| pending | “Validator is recomputing the score package.” |
| passed | “Validator confirmed the score matches committed features.” |
| failed | “Validator found a mismatch. Do not use this attestation for automated underwriting.” |
| expired | “Validation window expired.” |

## Workflow H — Lender decision and repayment reputation

### Goal

Show that lender owns credit decision and repayment updates reputation.

### Steps

1. Lender reviews attestation.
2. Lender selects decision:
   - approve;
   - reject;
   - manual review;
   - request more data.
3. UI requires explicit confirmation:
   - “This decision is made by the lender, not KreditAgent.”
4. Demo simulates accepted loan.
5. Lender clicks `Simulate on-time repayment`.
6. Reputation event posts.
7. Borrower reputation timeline updates.
8. Score/reputation summary reflects repayment signal.

### Decision form fields

- decision;
- principal IDR;
- term days;
- APR / fee optional;
- reason code;
- attestation ID;
- lender agent ID;
- policy version;
- human reviewer flag.

## Workflow I — Borrower dispute

### Goal

Negative reputation must be disputeable.

### Steps

1. Borrower opens `/borrower/reputation`.
2. Borrower sees negative event.
3. Borrower clicks `Open dispute`.
4. Borrower selects reason:
   - payment posted late by lender;
   - amount incorrect;
   - borrower identity mismatch;
   - fraud / account takeover;
   - other.
5. UI submits dispute.
6. Event status changes to `disputed`.
7. Lender and validator review off-chain evidence.
8. Final state becomes `upheld`, `reversed`, or `annotated`.

### Dispute UI rule

Do not delete negative history visually. Show the dispute state and final resolution trail.

## Workflow J — ForU AI-DID binding

### Goal

Represent ForU identity without overclaiming official API support.

### Steps

1. Borrower sees `ForU AI-DID` card.
2. In hackathon mode, UI shows mock DID binding:
   - `did:foru:bu-siti-demo`;
   - Identifi component: `business_credit_reliability`;
   - status: `demo binding`.
3. In future live mode, user connects official ForU account/API.
4. KreditAgent writes ForU DID into agentURI/off-chain profile.
5. ForU receives minimized reputation component, not raw data.

### Fallback copy

> Official ForU developer API is not assumed in this demo. KreditAgent shows the intended AI-DID binding and keeps raw business evidence inside KreditAgent/partner systems.
