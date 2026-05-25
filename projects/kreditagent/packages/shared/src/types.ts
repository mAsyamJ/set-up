import { z } from "zod";

export const NormalizedTransactionSchema = z.object({
  id: z.string(),
  source: z.enum(["qris", "tokopedia", "shopee", "repayment"]),
  timestamp: z.string(),
  amountIdr: z.number().nonnegative(),
  direction: z.enum(["inflow", "outflow"]),
  status: z.string(),
  description: z.string().optional().default("")
});

export type NormalizedTransaction = z.infer<typeof NormalizedTransactionSchema>;

export type ScoreFeatures = {
  revenueStability: number;
  businessContinuity: number;
  cashDiscipline: number;
  platformDiversification: number;
  reputationHistory: number;
  avgDailyRevenueIdr: number;
  revenueVolatility: number;
  activeDays: number;
  channelCount: number;
  refundRate: number;
  warnings: string[];
};

export type ScoreResult = {
  borrowerId: string;
  scoreVersion: string;
  score: number;
  band: "A" | "B" | "C" | "D" | "E";
  features: ScoreFeatures;
  positiveFactors: string[];
  riskFactors: string[];
  evidenceHash: `0x${string}`;
  featureHash: `0x${string}`;
  expiresAt: string;
};

export type AgentRole = "borrower" | "kredit" | "lender" | "validator";

export type DemoAgent = {
  agentId: number;
  role: AgentRole;
  name: string;
  owner: `0x${string}`;
  agentURI: string;
};

export type AttestationEnvelope = {
  attestationId: string;
  borrowerAgentId: number;
  issuerAgentId: number;
  score: number;
  band: string;
  scoreVersion: string;
  evidenceHash: `0x${string}`;
  featureHash: `0x${string}`;
  validationStatus: "pending" | "validated" | "failed";
  issuedAt: string;
  expiresAt: string;
  signature: `0x${string}`;
  payment?: {
    protocol: "x402";
    network: string;
    receiptHash: `0x${string}`;
    paidByAgentId: number;
    resource: string;
  };
};
