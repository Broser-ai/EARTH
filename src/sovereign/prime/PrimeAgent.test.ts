import { describe, expect, it } from 'vitest';
import { DeterministicFallbackPolicy } from './DeterministicFallbackPolicy.ts';
import { PrimeAgent } from './PrimeAgent.ts';
import { SessionRlPolicy } from './SessionRlPolicy.ts';
import { UntrainedRlPolicy } from './UntrainedRlPolicy.ts';
import type { MissionSpec, SwarmOutcome } from '../types.ts';

const catalog: MissionSpec[] = [
  { id: 'mission-cbam', title: 'CBAM cache fallback', tasks: [] },
  { id: 'mission-ethics', title: 'Ethics reweight', tasks: [] },
];

const ids = catalog.map((mission) => mission.id);

describe('SessionRlPolicy', () => {
  it('is the live Prime with trained=session-rl and updates logits after reward', () => {
    const policy = new SessionRlPolicy({ catalogIds: ids, persist: false, rng: () => 0 });
    const pending = { pendingMissions: catalog, lastOutcome: null, step: 0 };
    const before = policy.snapshot(ids);
    expect(policy.trained).toBe(true);
    expect(policy.trainedLabel).toBe('session-rl');
    expect(before.probabilities['mission-cbam']).toBeCloseTo(0.5, 5);

    const decision = policy.select(pending);
    expect(decision.missionId).toBe('mission-cbam');
    expect(decision.trainedLabel).toBe('session-rl');
    policy.observe(decision, 4);
    const after = policy.snapshot(ids);
    expect(after.probabilities['mission-cbam']).toBeGreaterThan(before.probabilities['mission-cbam'] ?? 0);
    expect(after.logits['mission-cbam']).toBeGreaterThan(after.logits['mission-ethics'] ?? 0);
    expect(after.episodes).toBe(1);
  });

  it('lowers probability of a mission that earned a negative reward', () => {
    const policy = new SessionRlPolicy({ catalogIds: ids, persist: false, rng: () => 0 });
    const pending = { pendingMissions: catalog, lastOutcome: null, step: 0 };
    const decision = policy.select(pending);
    const before = policy.probabilitiesFor(ids)[decision.missionId] ?? 0;
    policy.observe(decision, -3);
    const after = policy.probabilitiesFor(ids)[decision.missionId] ?? 0;
    expect(after).toBeLessThan(before);
  });
});

describe('Prime Agent', () => {
  it('does not pretend an untrained RL policy can select actions', () => {
    const policy = new UntrainedRlPolicy();
    expect(policy.kind).toBe('rl');
    expect(policy.trained).toBe(false);
    expect(policy.trainedLabel).toBe('untrained');
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
    expect(decision.trainedLabel).toBe('untrained');
    expect(decision.missionId).toBe('mission-cbam');
    expect(decision.reason).toMatch(/fallback/i);
  });

  it('uses session-rl as the acting policy and learns from recorded rewards', () => {
    const learner = new SessionRlPolicy({ catalogIds: ids, persist: false, rng: () => 0 });
    const prime = new PrimeAgent({
      policy: learner,
      fallback: new DeterministicFallbackPolicy(),
      learner,
    });
    const decision = prime.decide({ pendingMissions: catalog, lastOutcome: null, step: 0 });
    const success: SwarmOutcome = {
      missionId: decision.missionId,
      status: 'completed',
      executed: 2,
      blocked: 0,
      awaitingHitl: 0,
    };
    prime.recordOutcome(decision, success);
    expect(decision.trainedLabel).toBe('session-rl');
    expect(prime.policyStats(ids).episodes).toBe(1);
    expect(prime.policyStats(ids).logits[decision.missionId]).toBeGreaterThan(0);
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
    const loss = prime.recordOutcome({ ...decision, missionId: 'mission-ethics' }, failure);

    expect(win.reward).toBeGreaterThan(loss.reward);
    expect(prime.trajectories()).toHaveLength(2);
    expect(prime.trajectories()[0]?.missionId).toBe(decision.missionId);
  });
});
