# Deployment Runbook

## Local

```bash
forge install foundry-rs/forge-std
forge build
forge test -vvv
```

## Environment

```bash
export SEPOLIA_RPC_URL="https://..."
export DEPLOYER_PRIVATE_KEY="0x..."
export PROTOCOL_OWNER="0x..." # ideally a multisig in production
export NETWORK_NAME="sepolia"
export ETHERSCAN_API_KEY="..."
```

## Deploy

```bash
forge script script/DeployKreditProtocol.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify
```

Deployment writes `deployments/<NETWORK_NAME>.json`.

## Post-deploy checklist

- Confirm `identity`, `accessController`, `consentRegistry`, `scoreRegistry`, `validationRegistry`, `reputationRegistry`, and `paymentReceiptRegistry` addresses.
- Confirm seeded issuer/lender/validator roles.
- Transfer protocol ownership to a multisig if not already done.
- Register production agent URIs pointing to stable `https://` or `ipfs://` registration files.
- Publish source verification.
- Save tx hashes in hackathon submission docs.

## Demo sequence

1. Register BorrowerAgent, IssuerAgent, LenderAgent, ValidatorAgent.
2. Assign issuer/lender/validator roles.
3. Borrower grants consent to issuer for `credit_attestation`.
4. Issuer publishes score attestation.
5. Lender records x402 payment receipt.
6. Lender requests validation.
7. Validator submits pass result.
8. Lender posts repayment event.
9. Borrower opens dispute on a separate demo negative event.
