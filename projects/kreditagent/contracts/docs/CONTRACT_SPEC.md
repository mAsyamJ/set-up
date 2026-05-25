# Contract Specification

## `KreditAgentIdentityRegistry`

ERC-8004-style identity registry. Each agent is represented by an NFT-like `agentId`. The owner controls `agentURI`, metadata, active status, and agent wallet.

Important functions:

- `registerAgent(to, agentURI, agentType, agentWallet)`
- `setAgentURI(agentId, agentURI)`
- `setAgentWallet(agentId, wallet)`
- `isAgentController(agentId, account)`
- `transferFrom(from, to, agentId)`

Transfer behavior clears the agent wallet to prevent old delegated wallets from controlling an agent after ownership changes.

## `KreditAccessController`

Holds protocol-level controls:

- two-step ownership transfer;
- guardian pause;
- account roles;
- agent roles.

Sensitive write functions in downstream contracts call `requireNotPaused()`.

## `KreditConsentRegistry`

Borrower-controlled consent receipts. A consent is valid only if:

- borrower agent exists and is active;
- processor agent exists and is active;
- consent is not revoked;
- consent has not expired;
- purpose hash matches the requested use.

For score issuance, the required purpose hash is `keccak256("credit_attestation")`.

## `KreditScoreRegistry`

Publishes score attestations. Requirements:

- issuer agent has `ISSUER_AGENT_ROLE`;
- caller controls issuer agent;
- borrower agent is active;
- active consent exists for borrower → issuer → `credit_attestation`;
- score is between 300 and 900;
- score band is 1 to 5;
- all required hashes are non-zero;
- expiry is within `MAX_ATTESTATION_TTL`.

The attestation digest binds `chainId`, registry address, borrower, issuer, consent, score version, feature hash, evidence hash, narrative hash, score, band, and expiry.

## `KreditValidationRegistry`

Validation request requirements:

- requester is lender or issuer agent;
- caller controls requester agent;
- attestation is still usable;
- quorum is 1 to 7;
- deadline is within 14 days.

Validation submission requirements:

- validator has `VALIDATOR_AGENT_ROLE`;
- caller controls validator agent;
- validator has not already submitted;
- validator is not the issuer, requester, or owned by the same address as issuer;
- result code is one of pass/fail/needs-review.

## `KreditReputationRegistry`

Reputation events can be posted by lender or issuer agents. Events are tied to a subject agent and optionally to an attestation ID. If an attestation ID is provided, the borrower in the attestation must match the subject.

Borrower can open a dispute during the dispute window. Issuer/lender can respond. A dispute resolver account resolves as upheld or rejected. Rejected events return `effectiveScoreDelta = 0`.

## `KreditPaymentReceiptRegistry`

Records verified x402/API payment receipts. The contract does not transfer funds. It anchors receipt identity and prevents replay by:

- rejecting duplicate `receiptHash`;
- rejecting repeated resource/payer/payee combinations.

This makes paid access auditable without requiring the smart contract layer to implement x402 itself.
