# Product Requirements Document

## Product thesis

KreditAgent is not a lending marketplace. It is a credit attestation agent that lets licensed lenders consume verified MSME cash-flow reputation through agent-to-agent APIs.

## Personas

### MSME borrower

Needs working capital but lacks formal credit history. Wants a free, portable, understandable reputation profile.

### Licensed lender

Needs faster MSME underwriting, lower score-pull cost, auditability, and ongoing repayment/revenue monitoring.

### Validator

Checks score integrity and evidence hashes; does not approve loans.

## MVP requirements

| Requirement | Status in scaffold |
|---|---|
| Deterministic score from QRIS/e-commerce fixture | Implemented in `packages/shared/src/scoring.ts` |
| Prompt-injection sanitizer signal | Implemented as warnings on suspicious descriptions |
| Borrower UI | Implemented in `apps/web/app/page.tsx` |
| Lender x402 402/pay/retry flow | Implemented in API + UI mock mode |
| Agent identity/reputation/validation contracts | Implemented in `contracts/src/KreditAgentRegistries.sol` |
| Foundry tests | Implemented in `contracts/test/KreditAgentRegistries.t.sol` |
| Lender SDK | Implemented in `packages/sdk/src/index.ts` |
| Demo sample data | Implemented in `data/samples` |

## Out of scope for hackathon

- Real KYC/AML.
- Real QRIS partner integration.
- Production stablecoin lending.
- Live loan approval.
- Default prediction claims.
- OJK approval claims.

## Acceptance criteria

1. User can run local API and UI.
2. Borrower score is generated deterministically.
3. Attestation cannot be accessed until payment header is sent.
4. Repayment updates reputation state.
5. UI visibly explains that LLM cannot approve loans.
