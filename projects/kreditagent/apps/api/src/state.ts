import type { AttestationEnvelope, DemoAgent, ScoreResult } from "@kreditagent/shared";
import { demoAgents, syntheticBuSitiTransactions } from "@kreditagent/shared";

export type DemoState = {
  agents: DemoAgent[];
  scores: Map<string, ScoreResult>;
  attestations: Map<string, AttestationEnvelope>;
  reputationEvents: Array<Record<string, unknown>>;
  chainEvents: Array<Record<string, unknown>>;
  repaymentCount: number;
};

export function createInitialState(): DemoState {
  return { agents: demoAgents, scores: new Map(), attestations: new Map(), reputationEvents: [], chainEvents: [], repaymentCount: 0 };
}

export const state = createInitialState();
export const demoTransactions = syntheticBuSitiTransactions();

export function resetState() {
  state.scores.clear();
  state.attestations.clear();
  state.reputationEvents.length = 0;
  state.chainEvents.length = 0;
  state.repaymentCount = 0;
}
