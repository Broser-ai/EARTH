import type { MissionState, PolicyDecision } from '../types.ts';
import type { RlPolicy } from './UntrainedRlPolicy.ts';

export class DeterministicFallbackPolicy implements RlPolicy {
  readonly kind = 'deterministic' as const;
  readonly trained = false;
  readonly trainedLabel = 'untrained' as const;

  select(state: MissionState): PolicyDecision {
    const next = state.pendingMissions[0];
    if (!next) {
      throw new Error('no pending missions for deterministic fallback');
    }
    return {
      missionId: next.id,
      policyKind: 'deterministic',
      trained: false,
      trainedLabel: 'untrained',
      reason: 'deterministic fallback — first pending mission',
    };
  }
}
