import { describe, expect, it } from 'vitest';
import { EarthBus } from '../../bus/EarthBus.ts';
import type { Trajectory } from '../../types.ts';
import { EARTH_DEFAULT_LESSON } from '../inkling/types.ts';
import { InklingBrain } from '../inkling/InklingBrain.ts';
import {
  StubTinkerClient,
  trajectoriesToTinkerDataset,
  type TinkerClient,
} from './client.ts';
import type { TinkerJob, TinkerJobRequest } from './types.ts';
import { TinkerTrainer } from './TinkerTrainer.ts';

const sample: Trajectory = {
  id: 'traj-0001',
  missionId: 'mission-cbam',
  decision: {
    missionId: 'mission-cbam',
    policyKind: 'deterministic',
    trained: false,
    trainedLabel: 'untrained',
    reason: 'fallback',
  },
  outcome: { missionId: 'mission-cbam', status: 'completed', executed: 1, blocked: 0, awaitingHitl: 0 },
  reward: 2,
  ts: '2026-09-01T12:00:00Z',
  lessonId: EARTH_DEFAULT_LESSON.id,
};

class MockTinkerClient implements TinkerClient {
  readonly mode = 'stub' as const;
  lastRequest: TinkerJobRequest | undefined;

  async submit(request: TinkerJobRequest): Promise<TinkerJob> {
    this.lastRequest = request;
    return {
      id: 'job-mock-1',
      status: 'stubbed',
      baseModel: request.baseModel,
      samples: request.dataset.length,
      weightsUri: null,
      reason: 'mock',
    };
  }

  async get(): Promise<TinkerJob | undefined> {
    return undefined;
  }
}

describe('Tinker trainer', () => {
  it('maps Prime trajectories into a Tinker dataset', () => {
    const dataset = trajectoriesToTinkerDataset([sample]);
    expect(dataset).toEqual([
      {
        trajectoryId: 'traj-0001',
        missionId: 'mission-cbam',
        reward: 2,
        decisionKind: 'deterministic',
        lessonId: 'lesson-prime-mission-select',
      },
    ]);
  });

  it('submits a job through the client interface without faking weights', async () => {
    const bus = new EarthBus();
    const client = new MockTinkerClient();
    const trainer = new TinkerTrainer(bus, client);

    const job = await trainer.submit([sample], EARTH_DEFAULT_LESSON);

    expect(job.status).toBe('stubbed');
    expect(job.weightsUri).toBeNull();
    expect(client.lastRequest?.dataset).toHaveLength(1);
    expect(client.lastRequest?.lessonId).toBe(EARTH_DEFAULT_LESSON.id);
    expect(bus.history().some((event) => event.type === 'tinker.job.submitted')).toBe(true);
  });

  it('does not attach Inkling weights from a stubbed job', async () => {
    const brain = new InklingBrain();
    const trainer = new TinkerTrainer(new EarthBus(), new StubTinkerClient());
    const job = await trainer.submit([sample], EARTH_DEFAULT_LESSON);

    expect(trainer.applyCompletedJob(job, brain)).toBe(false);
    expect(brain.trained()).toBe(false);
  });
});
