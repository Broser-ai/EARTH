import type { MissionState, PolicyDecision, PolicyKind } from '../types.ts';

export interface RlPolicy {
  readonly kind: PolicyKind;
  readonly trained: boolean;
  select(state: MissionState): PolicyDecision;
}

export class UntrainedRlPolicy implements RlPolicy {
  readonly kind = 'rl' as const;
  readonly trained = false;

  select(_state: MissionState): PolicyDecision {
    throw new Error('Prime Agent RL has no trained weights — refusing to invent a policy');
  }
}
