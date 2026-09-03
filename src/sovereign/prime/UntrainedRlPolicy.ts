import type {
  MissionState,
  PolicyDecision,
  PolicyKind,
  PolicySnapshot,
  PolicyTrainedLabel,
} from '../types.ts';

export interface RlPolicy {
  readonly kind: PolicyKind;
  readonly trained: boolean;
  readonly trainedLabel: PolicyTrainedLabel;
  select(state: MissionState): PolicyDecision;
  observe?(decision: PolicyDecision, reward: number): void;
  snapshot?(pendingIds?: readonly string[]): PolicySnapshot;
}

export class UntrainedRlPolicy implements RlPolicy {
  readonly kind = 'rl' as const;
  readonly trained = false;
  readonly trainedLabel = 'untrained' as const;

  select(_state: MissionState): PolicyDecision {
    throw new Error('Prime Agent RL has no trained weights — refusing to invent a policy');
  }
}
