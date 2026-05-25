#!/usr/bin/env bash
set -euo pipefail
API=${API_BASE_URL:-http://localhost:4000}
echo "Health"
curl -s $API/health | jq .
echo "Score borrower"
curl -s -X POST $API/v1/borrowers/bor_bu_siti/score | jq .score,.band,.evidenceHash
ATT=$(curl -s -X POST $API/v1/borrowers/bor_bu_siti/publish-attestation | jq -r .attestation.attestationId)
echo "Attestation: $ATT"
echo "Unpaid request should be 402"
curl -i -s $API/v1/attestations/$ATT/audit | head -n 20
echo "Paid request"
curl -s -H 'PAYMENT-SIGNATURE: demo-paid' $API/v1/attestations/$ATT/audit | jq .
echo "Repayment"
curl -s -X POST $API/v1/borrowers/bor_bu_siti/simulate-repayment | jq .event,.updatedScore.score
