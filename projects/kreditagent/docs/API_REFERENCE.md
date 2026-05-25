# API Reference

## Health

`GET /health`

## Borrower

`POST /v1/demo/reset`

Resets in-memory demo state.

`POST /v1/borrowers/:id/score`

Generates deterministic score from sample data.

`POST /v1/borrowers/:id/publish-attestation`

Anchors or mock-publishes an attestation.

`POST /v1/borrowers/:id/simulate-repayment`

Posts a positive repayment reputation event.

## Lender

`GET /v1/attestations/:id/audit`

Without payment returns `402 Payment Required`.
With `PAYMENT-SIGNATURE: demo-paid` returns signed attestation in mock mode.

## Agents

`GET /v1/agents`

Returns demo BorrowerAgent, KreditAgent, LenderAgent, ValidatorAgent.
