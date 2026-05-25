import type { FastifyInstance } from "fastify";
import { generateNarrative, hashObject, pseudoSignature, scoreTransactions } from "@kreditagent/shared";
import type { AttestationEnvelope } from "@kreditagent/shared";
import { demoTransactions, resetState, state } from "./state.js";
import { requireX402Payment } from "./x402.js";

const BORROWER_ID = "bor_bu_siti";
const BORROWER_AGENT_ID = 2;
const KREDIT_AGENT_ID = 1;
const LENDER_AGENT_ID = 3;
const VALIDATOR_AGENT_ID = 4;

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true, service: "kreditagent-api", time: new Date().toISOString() }));

  app.get("/v1/agents", async () => ({ agents: state.agents }));

  app.post("/v1/demo/reset", async () => {
    resetState();
    return { ok: true };
  });

  app.get("/v1/demo/transactions", async () => ({ borrowerId: BORROWER_ID, transactions: demoTransactions }));

  app.post("/v1/borrowers/:id/score", async (request) => {
    const borrowerId = (request.params as { id: string }).id;
    const score = scoreTransactions(borrowerId, demoTransactions, state.repaymentCount);
    state.scores.set(borrowerId, score);
    return { ...score, narrative: generateNarrative(score) };
  });

  app.post("/v1/borrowers/:id/publish-attestation", async (request) => {
    const borrowerId = (request.params as { id: string }).id;
    const score = state.scores.get(borrowerId) ?? scoreTransactions(borrowerId, demoTransactions, state.repaymentCount);
    state.scores.set(borrowerId, score);
    const attestationId = `att_${borrowerId}_${Date.now()}`;
    const envelope: AttestationEnvelope = {
      attestationId,
      borrowerAgentId: BORROWER_AGENT_ID,
      issuerAgentId: KREDIT_AGENT_ID,
      score: score.score,
      band: score.band,
      scoreVersion: score.scoreVersion,
      evidenceHash: score.evidenceHash,
      featureHash: score.featureHash,
      validationStatus: "validated",
      issuedAt: new Date().toISOString(),
      expiresAt: score.expiresAt,
      signature: pseudoSignature({ attestationId, score })
    };
    state.attestations.set(attestationId, envelope);
    const txHash = hashObject({ type: "CreditAttestationPublished", attestationId, scoreHash: hashObject(score) });
    state.chainEvents.push({ txHash, type: "CreditAttestationPublished", attestationId, borrowerAgentId: BORROWER_AGENT_ID, score: score.score });
    state.chainEvents.push({ txHash: hashObject({ type: "ValidationSubmitted", attestationId }), type: "ValidationSubmitted", validatorAgentId: VALIDATOR_AGENT_ID, attestationId, result: "pass" });
    return { attestation: envelope, txHash, explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`, mode: "mock-chain-or-local" };
  });

  app.get("/v1/attestations", async () => ({ attestations: [...state.attestations.values()] }));

  app.get("/v1/attestations/:id/audit", async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const attestation = state.attestations.get(id);
    if (!attestation) return reply.code(404).send({ error: "ATTESTATION_NOT_FOUND" });
    const resource = `/v1/attestations/${id}/audit`;
    const payment = await requireX402Payment(request, reply, resource, "$0.25");
    if (!payment) return;
    return {
      ...attestation,
      payment: {
        protocol: "x402",
        network: process.env.X402_NETWORK ?? "eip155:84532",
        receiptHash: payment.receiptHash,
        paidByAgentId: LENDER_AGENT_ID,
        resource
      }
    };
  });

  app.post("/v1/borrowers/:id/simulate-repayment", async (request) => {
    const borrowerId = (request.params as { id: string }).id;
    state.repaymentCount += 1;
    const event = {
      eventId: `rep_${Date.now()}`,
      borrowerId,
      subjectAgentId: BORROWER_AGENT_ID,
      issuerAgentId: LENDER_AGENT_ID,
      eventType: "repayment_on_time",
      scoreDelta: 8,
      evidenceHash: hashObject({ borrowerId, repaymentNumber: state.repaymentCount, status: "on_time" }),
      timestamp: new Date().toISOString()
    };
    state.reputationEvents.push(event);
    state.chainEvents.push({ txHash: hashObject(event), type: "ReputationPosted", ...event });
    const updatedScore = scoreTransactions(borrowerId, demoTransactions, state.repaymentCount);
    state.scores.set(borrowerId, updatedScore);
    return { event, updatedScore, narrative: generateNarrative(updatedScore) };
  });

  app.get("/v1/reputation-events", async () => ({ events: state.reputationEvents }));
  app.get("/v1/chain-events", async () => ({ events: state.chainEvents }));
}
