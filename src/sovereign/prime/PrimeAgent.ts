import type {
  PolicyDecision,
  MissionState,
  PolicySnapshot,
  PolicyTrainedLabel,
  SwarmOutcome,
  Trajectory,
} from '../types.ts';
import type { SessionRlPolicy } from './SessionRlPolicy.ts';
import type { RlPolicy } from './UntrainedRlPolicy.ts';

export function rewardFromOutcome(outcome: SwarmOutcome): number {
  const completion = outcome.status === 'completed' ? 1 : -1;
  return outcome.executed - 2 * outcome.blocked - outcome.awaitingHitl + completion;
}

export class PrimeAgent {
  private readonly policy: RlPolicy;
  private readonly fallback: RlPolicy;
  private readonly learner: SessionRlPolicy | null;
  private readonly log: Trajectory[] = [];
  private seq = 0;
  private lastDecision: PolicyDecision | null = null;

  constructor(options: { policy: RlPolicy; fallback: RlPolicy; learner?: SessionRlPolicy }) {
    this.policy = options.policy;
    this.fallback = options.fallback;
    this.learner = options.learner ?? null;
  }

  decide(state: MissionState): PolicyDecision {
    if (this.policy.trained) {
      const decision = this.policy.select(state);
      this.lastDecision = decision;
      return decision;
    }
    const decision = this.fallback.select(state);
    const wrapped: PolicyDecision = {
      ...decision,
      policyKind: 'deterministic',
      trained: false,
      trainedLabel: 'untrained',
      reason: `RL untrained — ${decision.reason}`,
    };
    this.lastDecision = wrapped;
    return wrapped;
  }

  recordOutcome(
    decision: PolicyDecision,
    outcome: SwarmOutcome,
    hook?: { lessonId?: string },
  ): Trajectory {
    this.seq += 1;
    const trajectory: Trajectory = {
      id: `traj-${this.seq.toString().padStart(4, '0')}`,
      missionId: decision.missionId,
      decision,
      outcome,
      reward: rewardFromOutcome(outcome),
      ts: new Date().toISOString(),
      lessonId: hook?.lessonId,
    };
    this.log.push(trajectory);
    this.learner?.observe(decision, trajectory.reward);
    if (this.policy !== this.learner) {
      this.policy.observe?.(decision, trajectory.reward);
    }
    return trajectory;
  }

  trajectories(): readonly Trajectory[] {
    return this.log;
  }

  actingTrainedLabel(): PolicyTrainedLabel {
    if (this.lastDecision) return this.lastDecision.trainedLabel;
    return this.policy.trained ? this.policy.trainedLabel : 'untrained';
  }

  lastPolicyDecision(): PolicyDecision | null {
    return this.lastDecision;
  }

  policyStats(pendingIds?: readonly string[]): PolicySnapshot {
    if (this.learner) {
      return this.learner.snapshot(pendingIds);
    }
    const snap = this.policy.snapshot?.(pendingIds);
    if (snap) return snap;
    return {
      trainedLabel: this.actingTrainedLabel(),
      episodes: this.log.length,
      logits: {},
      pulls: {},
      meanReward: {},
      probabilities: {},
    };
  }
}
