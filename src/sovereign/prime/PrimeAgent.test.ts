import { describe, expect, it } from 'vitest';
import { DeterministicFallbackPolicy } from './DeterministicFallbackPolicy.ts';
import { PrimeAgent } from './PrimeAgent.ts';
import { UntrainedRlPolicy } from './UntrainedRlPolicy.ts';
import type { MissionSpec, SwarmOutcome } from '../types.ts';

const catalog: MissionSpec[] = [
  {
    id: 'mission-cbam',
    title: 'CBAM cache fallback',
    tasks: [],
  },
  {
    id: 'mission-ethics',
    title: 'Ethics reweight',
    tasks: [],
  },
];

describe('Prime Agent', () => {
  it('does not pretend an untrained RL policy can select actions', () => {
    const policy = new UntrainedRlPolicy();
    expect(policy.kind).toBe('rl');
    expect(policy.trained).toBe(false);
    expect(() =>
      policy.select({ pendingMissions: catalog, lastOutcome: null, step: 0 }),
    ).toThrow(/no trained weights/i);
  });

  it('uses the deterministic fallback when the RL policy is untrained', () => {
    const prime = new PrimeAgent({
      policy: new UntrainedRlPolicy(),
      fallback: new DeterministicFallbackPolicy(),
    });

    const decision = prime.decide({
      pendingMissions: catalog,
      lastOutcome: null,
      step: 0,
    });

    expect(decision.policyKind).toBe('deterministic');
    expect(decision.trained).toBe(false);
    expect(decision.missionId).toBe('mission-cbam');
    expect(decision.reason).toMatch(/fallback/i);
  });

  it('records trajectories with a reward derived from swarm outcomes', () => {
    const prime = new PrimeAgent({
      policy: new UntrainedRlPolicy(),
      fallback: new DeterministicFallbackPolicy(),
    });
    const decision = prime.decide({
      pendingMissions: catalog,
      lastOutcome: null,
      step: 0,
    });

    const success: SwarmOutcome = {
      missionId: decision.missionId,
      status: 'completed',
      executed: 2,
      blocked: 0,
      awaitingHitl: 0,
    };
    const win = prime.recordOutcome(decision, success);

    const failure: SwarmOutcome = {
      missionId: 'mission-ethics',
      status: 'blocked',
      executed: 0,
      blocked: 1,
      awaitingHitl: 0,
    };
    const loss = prime.recordOutcome(
      { ...decision, missionId: 'mission-ethics' },
      failure,
    );

    expect(win.reward).toBeGreaterThan(loss.reward);
    expect(prime.trajectories()).toHaveLength(2);
    expect(prime.trajectories()[0]?.missionId).toBe(decision.missionId);
  });
});
