import type { EarthBus } from '../../bus/EarthBus.ts';
import type { Trajectory } from '../../types.ts';
import type { InklingBrain } from '../inkling/InklingBrain.ts';
import type { InklingLesson } from '../inkling/types.ts';
import { trajectoriesToTinkerDataset, tinkerStatusLabel, type TinkerClient } from './client.ts';
import type { TinkerJob } from './types.ts';

const DEFAULT_BASE_MODEL = 'thinking-machines/inkling';

export class TinkerTrainer {
  private lastJob: TinkerJob | null = null;

  constructor(
    private readonly bus: EarthBus,
    private readonly client: TinkerClient,
  ) {}

  mode(): TinkerClient['mode'] {
    return this.client.mode;
  }

  lastSubmitted(): TinkerJob | null {
    return this.lastJob;
  }

  async submit(
    trajectories: readonly Trajectory[],
    lesson?: InklingLesson | null,
  ): Promise<TinkerJob> {
    const job = await this.client.submit({
      baseModel: DEFAULT_BASE_MODEL,
      loraRank: 32,
      dataset: trajectoriesToTinkerDataset(trajectories),
      lessonId: lesson?.id,
    });
    this.lastJob = job;
    this.bus.emit({
      type: 'tinker.job.submitted',
      source: 'prime.tinker',
      message: `${tinkerStatusLabel(job.status)} ${job.id} samples=${job.samples}`,
      payload: {
        jobId: job.id,
        status: job.status,
        samples: job.samples,
        lessonId: lesson?.id ?? null,
        live: this.client.mode !== 'stub',
      },
    });
    return job;
  }

  applyCompletedJob(job: TinkerJob, brain: InklingBrain): boolean {
    if (job.status !== 'completed' || !job.weightsUri) {
      this.bus.emit({
        type: 'tinker.job.updated',
        source: 'prime.tinker',
        message: `no weights to attach (${tinkerStatusLabel(job.status)})`,
        payload: { jobId: job.id, status: job.status, attached: false },
      });
      return false;
    }
    brain.policy.attachWeights({
      uri: job.weightsUri,
      liveInference: false,
    });
    this.bus.emit({
      type: 'tinker.job.updated',
      source: 'prime.tinker',
      message: `attached fixture weights ${job.weightsUri}`,
      payload: { jobId: job.id, status: job.status, attached: true, liveInference: false },
    });
    return true;
  }
}
