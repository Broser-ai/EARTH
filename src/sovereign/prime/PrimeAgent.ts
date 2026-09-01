import type {
  PolicyDecision,
  MissionState,
  SwarmOutcome,
  Trajectory,
} from '../types.ts';
import type { RlPolicy } from './UntrainedRlPolicy.ts';

export function rewardFromOutcome(outcome: SwarmOutcome): number {
  const completion = outcome.status === 'completed' ? 1 : -1;
  return outcome.executed - 2 * outcome.blocked - outcome.awaitingHitl + completion;
}

export class PrimeAgent {
  private readonly policy: RlPolicy;
  private readonly fallback: RlPolicy;
  private readonly log: Trajectory[] = [];
  private seq = 0;

  constructor(options: { policy: RlPolicy; fallback: RlPolicy }) {
    this.policy = options.policy;
    this.fallback = options.fallback;
  }

  decide(state: MissionState): PolicyDecision {
    if (this.policy.trained) {
      return this.policy.select(state);
    }
    const decision = this.fallback.select(state);
    return {
      ...decision,
      policyKind: 'deterministic',
      trained: false,
      reason: `RL untrained — ${decision.reason}`,
    };
  }

  recordOutcome(decision: PolicyDecision, outcome: SwarmOutcome): Trajectory {
    this.seq += 1;
    const trajectory: Trajectory = {
      id: `traj-${this.seq.toString().padStart(4, '0')}`,
      missionId: decision.missionId,
      decision,
      outcome,
      reward: rewardFromOutcome(outcome),
      ts: new Date().toISOString(),
    };
    this.log.push(trajectory);
    return trajectory;
  }

  trajectories(): readonly Trajectory[] {
    return this.log;
  }
}
