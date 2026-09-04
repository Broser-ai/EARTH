import { describe, expect, it } from 'vitest';
import { DeterministicFallbackPolicy } from '../DeterministicFallbackPolicy.ts';
import { PrimeAgent } from '../PrimeAgent.ts';
import type { MissionSpec, SwarmOutcome } from '../../types.ts';
import { InklingBrain } from './InklingBrain.ts';
import { EARTH_DEFAULT_LESSON } from './types.ts';

const catalog: MissionSpec[] = [
  { id: 'mission-cbam', title: 'CBAM', tasks: [] },
  { id: 'mission-ethics', title: 'Ethics', tasks: [] },
];

const completed: SwarmOutcome = {
  missionId: 'mission-cbam',
  status: 'completed',
  executed: 1,
  blocked: 0,
  awaitingHitl: 0,
};

describe('Inkling brain', () => {
  it('stays untrained and does not invent live inference', () => {
    const brain = new InklingBrain();
    expect(brain.trained()).toBe(false);
    expect(brain.policy.liveInference).toBe(false);
    expect(() =>
      brain.policy.select({ pendingMissions: catalog, lastOutcome: null, step: 0 }),
    ).toThrow(/no trained weights/i);
  });

  it('hooks an Inkling lesson onto Prime trajectories', () => {
    const brain = new InklingBrain();
    brain.attachLesson(EARTH_DEFAULT_LESSON);
    const prime = new PrimeAgent({
      policy: brain.policy,
      fallback: new DeterministicFallbackPolicy(),
    });
    const decision = prime.decide({ pendingMissions: catalog, lastOutcome: null, step: 0 });
    const trajectory = prime.recordOutcome(decision, completed, { lessonId: brain.currentLesson()?.id });
    const hooked = brain.observe(trajectory);

    expect(decision.trained).toBe(false);
    expect(hooked.lessonId).toBe('lesson-prime-mission-select');
    expect(brain.hookedEpisodes()).toHaveLength(1);
    expect(brain.conceptKind()).toBe('select_mission');
  });

  it('selects a preferred mission only after fixture weights are attached', () => {
    const brain = new InklingBrain();
    brain.policy.attachWeights({
      uri: 'fixture://inkling',
      preferredMissionId: 'mission-ethics',
      liveInference: false,
    });

    const decision = brain.policy.select({
      pendingMissions: catalog,
      lastOutcome: null,
      step: 0,
    });

    expect(decision.trained).toBe(true);
    expect(decision.missionId).toBe('mission-ethics');
    expect(decision.reason).toMatch(/not live inference/i);
  });
});
