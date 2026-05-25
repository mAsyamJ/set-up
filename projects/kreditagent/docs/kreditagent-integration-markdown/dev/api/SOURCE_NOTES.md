# Source Notes

This backend spec is grounded in the KreditAgent integration direction:

- x402/Base is the paid API rail.
- ERC-8004 is the trust registry.
- ForU AI-DID / Identifi is the user-facing identity and reputation layer.
- KreditAgent backend coordinates borrower consent, scoring, attestations, validation, payment, and reputation.

## Technical source anchors

### x402

- Coinbase x402 docs: https://docs.cdp.coinbase.com/x402/welcome
- x402 Seller Quickstart: https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
- x402 How It Works: https://docs.cdp.coinbase.com/x402/core-concepts/how-it-works
- x402 GitHub: https://github.com/x402-foundation/x402

### ERC-8004

- EIP-8004: https://eips.ethereum.org/EIPS/eip-8004
- ERC-8004 contracts: https://github.com/erc-8004/erc-8004-contracts
- 8004 build page: https://www.8004.org/build

### Backend stack

- Fastify docs: https://fastify.io/
- Prisma docs: https://www.prisma.io/docs
- BullMQ docs: https://docs.bullmq.io/
- OpenAPI Specification: https://spec.openapis.org/oas/v3.1.0.html
- OpenTelemetry Node.js docs: https://opentelemetry.io/docs/languages/js/
- OWASP API Security: https://owasp.org/www-project-api-security/

### ForU AI

- ForU AI site: https://foruai.io/
- ForU AI GitBook: https://foru-ai.gitbook.io/foru-ai
- ForU AI Google Play listing: https://play.google.com/store/apps/details?id=ai.untukmu.mobile

## Notes

- ForU public materials describe AI-DID / Identifi concepts, but a public developer API reference may not be available. The backend should therefore implement a provider interface and use a clearly labeled mock mode during hackathon.
- x402 mock mode is acceptable for local demo reliability, but the backend must label it as mock and must not claim production settlement.
- ERC-8004 identity/reputation/validation should be treated as the canonical public trust layer; KreditAgent-specific tables preserve private details and workflow state off-chain.
