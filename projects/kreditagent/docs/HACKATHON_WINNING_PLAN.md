# Hackathon Winning Plan

## Strategy

The judging rubric rewards real-world impact and safety as much as code. KreditAgent should therefore demo a complete trust/payment loop, not a generic chatbot.

## Winning demo path

1. Borrower opens dashboard and sees consent state.
2. Borrower uploads QRIS and e-commerce sample data.
3. Scoring engine produces score, evidence hash, feature hash, risk factors.
4. KreditAgent publishes credit attestation to ERC-8004-style ledger.
5. ValidatorAgent validates the score.
6. LenderAgent opens lender dashboard and requests audit attestation.
7. API returns HTTP 402 with x402-compatible payment terms.
8. Lender pays in demo mode and receives signed attestation.
9. Lender simulates disbursement decision.
10. Borrower repays on time and reputation event is posted.

## What judges should remember

- Real-world: Indonesia MSME credit trust gap.
- Safety: deterministic score; LLM explanation only.
- Technical: ERC-8004-style identity/reputation/validation + x402-compatible paywall.
- Business: lender-paid attestation and monitoring fees.

## Do not claim

- Production loan approval.
- OJK approval.
- Stablecoin lending regulatory clarity.
- Proven default prediction.

## Do claim

- Sandbox-ready prototype.
- Licensed-lender infrastructure.
- Portable borrower-owned credit reputation.
- Auditable underwriting signal.
