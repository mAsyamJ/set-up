import type { FastifyReply, FastifyRequest } from "fastify";
import { hashObject } from "@kreditagent/shared";

export type X402Terms = {
  scheme: "exact";
  price: string;
  network: string;
  payTo: string;
  resource: string;
  description: string;
  mimeType: string;
  expiresAt: string;
};

export function buildTerms(resource: string, price = "$0.25"): X402Terms {
  return {
    scheme: "exact",
    price,
    network: process.env.X402_NETWORK ?? "eip155:84532",
    payTo: process.env.X402_PAY_TO ?? "0x0000000000000000000000000000000000004020",
    resource,
    description: "KreditAgent audit-grade credit attestation",
    mimeType: "application/json",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  };
}

export async function requireX402Payment(request: FastifyRequest, reply: FastifyReply, resource: string, price = "$0.25") {
  const terms = buildTerms(resource, price);
  const paymentSignature = request.headers["payment-signature"];
  const mockMode = (process.env.X402_MOCK_MODE ?? "true") === "true";

  if (mockMode) {
    if (paymentSignature === "demo-paid") {
      return { paid: true, receiptHash: hashObject({ resource, paymentSignature, paidAt: new Date().toISOString() }) };
    }
    reply.header("PAYMENT-REQUIRED", JSON.stringify(terms));
    reply.code(402).send({ error: "PAYMENT_REQUIRED", mode: "x402-mock", terms, hint: "Retry with PAYMENT-SIGNATURE: demo-paid for hackathon mock mode." });
    return null;
  }

  // Production integration point:
  // Replace with @x402/express, @x402/hono, or facilitator verification.
  reply.header("PAYMENT-REQUIRED", JSON.stringify(terms));
  reply.code(402).send({ error: "PAYMENT_REQUIRED", mode: "x402-live-not-configured", terms });
  return null;
}
