import type { NormalizedTransaction, ScoreFeatures, ScoreResult } from "./types.js";
import { hashObject } from "./hash.js";

export const SCORE_VERSION = "ka-score-v0.1.0";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number {
  const m = avg(values);
  return Math.sqrt(avg(values.map((v) => (v - m) ** 2)));
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function buildFeatures(transactions: NormalizedTransaction[], repaymentCount = 0): ScoreFeatures {
  const warnings: string[] = [];
  const inflows = transactions.filter((t) => t.direction === "inflow" && t.status !== "refunded");
  const sources = new Set(transactions.map((t) => t.source));
  const byDay = new Map<string, number>();
  for (const tx of inflows) {
    byDay.set(dateKey(tx.timestamp), (byDay.get(dateKey(tx.timestamp)) ?? 0) + tx.amountIdr);
    if (/ignore|instruction|approve|score\s*900|system prompt/i.test(tx.description ?? "")) {
      warnings.push(`Prompt-injection-like text ignored in record ${tx.id}`);
    }
  }
  const daily = [...byDay.values()];
  const avgDailyRevenueIdr = Math.round(avg(daily));
  const revenueVolatility = avgDailyRevenueIdr === 0 ? 1 : std(daily) / avgDailyRevenueIdr;
  const activeDays = byDay.size;
  const refundAmount = transactions.filter((t) => t.status === "refunded").reduce((s, t) => s + t.amountIdr, 0);
  const gross = transactions.filter((t) => t.direction === "inflow").reduce((s, t) => s + t.amountIdr, 0);
  const refundRate = gross === 0 ? 0 : refundAmount / gross;

  if (activeDays < 30) warnings.push("Evidence window below 30 active days");
  if (refundRate > 0.08) warnings.push("High refund rate");
  if (revenueVolatility > 0.65) warnings.push("High revenue volatility");

  const revenueStability = clamp01(1 - revenueVolatility);
  const businessContinuity = clamp01(activeDays / 90);
  const cashDiscipline = clamp01(1 - refundRate * 3);
  const platformDiversification = clamp01(sources.size / 4);
  const reputationHistory = clamp01(repaymentCount / 6);

  return {
    revenueStability,
    businessContinuity,
    cashDiscipline,
    platformDiversification,
    reputationHistory,
    avgDailyRevenueIdr,
    revenueVolatility,
    activeDays,
    channelCount: sources.size,
    refundRate,
    warnings
  };
}

export function scoreFromFeatures(borrowerId: string, features: ScoreFeatures, evidence: unknown): ScoreResult {
  let score = 300
    + features.revenueStability * 180
    + features.businessContinuity * 130
    + features.cashDiscipline * 160
    + features.platformDiversification * 80
    + features.reputationHistory * 50;

  const riskFactors: string[] = [];
  const positiveFactors: string[] = [];

  if (features.activeDays < 30) { score -= 80; riskFactors.push("Short evidence history below 30 active days"); }
  if (features.refundRate > 0.08) { score -= 50; riskFactors.push("Refund or reversal rate is elevated"); }
  if (features.revenueVolatility > 0.65) { score -= 60; riskFactors.push("Revenue is volatile"); }
  if (features.warnings.length) { score -= 20; riskFactors.push("Some uploaded rows contained unsafe text and were sanitized"); }

  if (features.avgDailyRevenueIdr > 500_000) positiveFactors.push("Meaningful daily digital revenue");
  if (features.revenueStability > 0.7) positiveFactors.push("Stable daily QRIS/e-commerce inflows");
  if (features.businessContinuity > 0.6) positiveFactors.push("Business has consistent active-day history");
  if (features.channelCount >= 2) positiveFactors.push("Multiple data sources reduce platform concentration risk");
  if (features.reputationHistory > 0) positiveFactors.push("Prior on-time repayment signal exists");

  const finalScore = Math.max(300, Math.min(900, Math.round(score)));
  const band = finalScore >= 760 ? "A" : finalScore >= 680 ? "B" : finalScore >= 600 ? "C" : finalScore >= 500 ? "D" : "E";
  const evidenceHash = hashObject(evidence);
  const featureHash = hashObject({ scoreVersion: SCORE_VERSION, features });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return { borrowerId, scoreVersion: SCORE_VERSION, score: finalScore, band, features, positiveFactors, riskFactors, evidenceHash, featureHash, expiresAt };
}

export function scoreTransactions(borrowerId: string, transactions: NormalizedTransaction[], repaymentCount = 0): ScoreResult {
  const features = buildFeatures(transactions, repaymentCount);
  return scoreFromFeatures(borrowerId, features, transactions);
}

export function generateNarrative(result: ScoreResult): { borrowerSummary: string; lenderMemo: string; manualReviewQuestions: string[] } {
  const factors = result.positiveFactors.join("; ") || "No strong positive factors yet";
  const risks = result.riskFactors.join("; ") || "No major deterministic risk flags";
  return {
    borrowerSummary: `Your current KreditAgent score is ${result.score}/${900} (${result.band}). Main positives: ${factors}. Main risks: ${risks}.`,
    lenderMemo: `Deterministic score ${result.score} generated with ${result.scoreVersion}. Evidence hash ${result.evidenceHash}. The LLM did not set the score; it only summarized approved factors.`,
    manualReviewQuestions: result.riskFactors.length ? ["Can the borrower explain the flagged data-quality/risk items?", "Is there additional verified revenue evidence?"] : ["Confirm borrower identity and intended working-capital use."]
  };
}
