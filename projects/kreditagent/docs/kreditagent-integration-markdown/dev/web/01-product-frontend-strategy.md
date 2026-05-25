# 01 — Product Frontend Strategy

## Frontend mission

The KreditAgent frontend must make a complex protocol feel safe, obvious, and credible in under 90 seconds.

The product has four audiences:

1. **MSME borrower** — needs trust, consent control, clear score explanation, and a path to lender-ready reputation.
2. **Lender / underwriter** — needs fast score review, evidence hashes, validation status, x402 payment proof, and risk disclaimers.
3. **Judge / technical reviewer** — needs to see that ERC-8004, x402, deterministic scoring, and ForU identity are real product primitives, not decorations.
4. **Regulator / compliance reviewer** — needs to see that KreditAgent does not lend, does not store raw data on-chain, does not let AI approve credit, and supports consent/revocation/disputes.

## Product promise in UI

> Turn MSME business activity into a portable, verifiable credit reputation lenders can trust.

Every screen should reinforce one of these ideas:

- **Borrower owns consent.**
- **KreditAgent explains, but does not approve loans.**
- **Lender pays for attestations.**
- **ERC-8004 makes agent trust portable.**
- **x402 makes paid score access machine-readable.**
- **ForU AI-DID gives the user-facing identity/reputation layer.**

## Frontend must not do

The frontend must not:

- present KreditAgent as a lender;
- promise loan approval;
- show unsupported production regulatory claims;
- expose raw QRIS/e-commerce personal data in on-chain views;
- let LLM-generated text appear as a final credit decision;
- hide payment, consent, or validation failures;
- make wallet signatures look like ordinary web confirmations without explaining purpose.

## Product surfaces

| Surface | Audience | Goal |
|---|---|---|
| Public landing | judges, lenders, partners | Explain why KreditAgent exists and launch demo. |
| Borrower app | MSME borrower | Link identity, grant consent, upload/link evidence, generate score, review explanation, publish attestation. |
| Lender app | lender/underwriter | Pay for audit-grade attestation, review score package, record lender-owned decision, simulate repayment event. |
| Protocol explorer | technical reviewers | Show ERC-8004 agents, attestations, validations, reputation events, and x402 receipts. |
| Admin/demo console | internal hackathon operator | Reset demo state, seed sample borrowers, toggle mock/live x402, view logs. |

## Winning hackathon frontend narrative

The UI should tell a complete story without requiring judges to inspect code first:

1. **Borrower evidence exists.** Bu Siti has QRIS and e-commerce activity.
2. **Consent gates usage.** She chooses what to share and why.
3. **Score is deterministic.** The score shows formula factors, hashes, version, expiry.
4. **AI is bounded.** The explanation explicitly says it is generated from deterministic factors only.
5. **Attestation is portable.** The score is linked to a BorrowerAgent and KreditAgent issuer.
6. **Lender pays.** Lender sees `402 Payment Required`, pays via x402, and receives audit-grade payload.
7. **Validation is independent.** ValidatorAgent confirms the score package.
8. **Reputation evolves.** Repayment updates reputation; future lenders do not see a blank file.

## Product north star metric

For a frontend hackathon demo:

> Time from opening borrower screen to showing paid lender attestation: under 90 seconds.

For production:

> Percentage of consented borrowers who successfully generate a lender-shareable score and receive at least one lender pull.

## Frontend priorities

### Priority 1 — Demo clarity

The first version should optimize for a smooth judge demo:

- one borrower profile preloaded;
- one lender profile preloaded;
- deterministic sample data;
- visible status timeline;
- clear success/failure states;
- copy that explains trust/payment logic.

### Priority 2 — Safety and trust

All high-stakes states must be explicit:

- consent active/expired/revoked;
- score valid/expired/stale;
- validation pending/validated/failed;
- x402 unpaid/paid/invalid/replayed;
- chain pending/confirmed/failed;
- lender decision is lender-owned.

### Priority 3 — Production extensibility

After the demo works, the UI should support:

- real partner data adapters;
- multiple borrowers;
- multiple lenders;
- validation quorum;
- disputes;
- regional/language support;
- real x402 facilitator;
- real ForU AI-DID once official API is available.

## Recommended product mode toggles

| Mode | Description | UI badge |
|---|---|---|
| `DEMO_MOCK` | local backend, mock x402, mock chain tx hashes | Demo mode |
| `TESTNET_LIVE` | Base Sepolia/Sepolia contracts, x402 testnet facilitator | Testnet live |
| `PRODUCTION_SANDBOX` | real partners, sandbox terms, non-production lending | Sandbox |
| `PRODUCTION` | audited contracts, compliance approved, real partners | Production |

## Core UX rule

If something is trust-critical, show it as a timeline step with status, timestamp, and proof link.

Example:

```text
Consent granted → Evidence hashed → Score generated → Attestation published → x402 paid → Validation passed → Repayment reputation posted
```
