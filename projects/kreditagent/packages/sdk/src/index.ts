import type { AttestationEnvelope, ScoreResult } from "@kreditagent/shared";

export class KreditAgentClient {
  constructor(private readonly baseUrl: string, private readonly paymentSignature = "demo-paid") {}

  async scoreBorrower(borrowerId: string): Promise<ScoreResult> {
    const res = await fetch(`${this.baseUrl}/v1/borrowers/${borrowerId}/score`, { method: "POST" });
    if (!res.ok) throw new Error(`Score failed: ${res.status}`);
    return res.json();
  }

  async requestAuditAttestation(attestationId: string): Promise<AttestationEnvelope> {
    const first = await fetch(`${this.baseUrl}/v1/attestations/${attestationId}/audit`);
    if (first.status !== 402 && !first.ok) throw new Error(`Unexpected status: ${first.status}`);
    const paid = await fetch(`${this.baseUrl}/v1/attestations/${attestationId}/audit`, {
      headers: { "PAYMENT-SIGNATURE": this.paymentSignature }
    });
    if (!paid.ok) throw new Error(`Paid attestation failed: ${paid.status}`);
    return paid.json();
  }
}
