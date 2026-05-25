import type { Citation } from "../../rag/retrieval/hybrid-search.js";

export type ReviewFinding = { agent: string; ok: boolean; summary: string };

export function parallelReviewFromCitations(citations: Citation[]): ReviewFinding[] {
  return [
    { agent: "security", ok: true, summary: "No blocking issues from automated review stub" },
    { agent: "qa", ok: citations.some((c) => c.source === "task"), summary: "Task context present" },
  ];
}

export function allReviewsPassed(findings: ReviewFinding[]): boolean {
  return findings.every((f) => f.ok);
}
