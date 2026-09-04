import type { MissionState, PolicyDecision } from '../../types.ts';
import type { RlPolicy } from '../UntrainedRlPolicy.ts';
import type { InklingWeights } from './types.ts';

/**
 * Prime RL policy slot backed by Thinking Machines Inkling weights.
 * Without attached weights this refuses to select — DeterministicFallbackPolicy
 * remains the acting brain. Fixture weights in tests are not live Inkling inference.
 */
export class InklingPolicy implements RlPolicy {
  readonly kind = 'rl' as const;
  private weights: InklingWeights | null = null;

  get trained(): boolean {
    return this.weights !== null;
  }

  get trainedLabel(): 'untrained' | 'inkling' {
    return this.weights ? 'inkling' : 'untrained';
  }

  get liveInference(): boolean {
    return this.weights?.liveInference === true;
  }

  weightsUri(): string | null {
    return this.weights?.uri ?? null;
  }

  attachWeights(weights: InklingWeights): void {
    this.weights = weights;
  }

  detachWeights(): void {
    this.weights = null;
  }

  select(state: MissionState): PolicyDecision {
    if (!this.weights) {
      throw new Error('Inkling brain has no trained weights — refusing to invent a policy');
    }

    const preferred = this.weights.preferredMissionId
      ? state.pendingMissions.find((mission) => mission.id === this.weights?.preferredMissionId)
      : undefined;
    const next = preferred ?? state.pendingMissions[0];
    if (!next) {
      throw new Error('Inkling policy has no pending missions to select');
    }

    const live = this.weights.liveInference;
    return {
      missionId: next.id,
      policyKind: 'rl',
      trained: true,
      trainedLabel: 'inkling',
      reason: live
        ? `inkling live weights ${this.weights.uri} selected ${next.id}`
        : `inkling fixture weights ${this.weights.uri} selected ${next.id} (not live inference)`,
    };
  }
}
