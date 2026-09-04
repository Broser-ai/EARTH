import type { Trajectory } from '../../types.ts';
import { assertNever } from '../../types.ts';
import type { TinkerClientMode, TinkerDatum, TinkerJob, TinkerJobRequest, TinkerJobStatus } from './types.ts';

export interface TinkerClient {
  readonly mode: TinkerClientMode;
  submit(request: TinkerJobRequest): Promise<TinkerJob>;
  get(jobId: string): Promise<TinkerJob | undefined>;
}

export function trajectoriesToTinkerDataset(rows: readonly Trajectory[]): TinkerDatum[] {
  return rows.map((row) => ({
    trajectoryId: row.id,
    missionId: row.missionId,
    reward: row.reward,
    decisionKind: row.decision.policyKind,
    lessonId: row.lessonId,
  }));
}

let stubSeq = 0;

/**
 * No TINKER_API_KEY / no Python ServiceClient in this TS runtime.
 * Live client attaches when credentials exist; do not fake training.
 */
export class StubTinkerClient implements TinkerClient {
  readonly mode = 'stub' as const;
  private readonly jobs = new Map<string, TinkerJob>();

  async submit(request: TinkerJobRequest): Promise<TinkerJob> {
    stubSeq += 1;
    const job: TinkerJob = {
      id: `tinker-stub-${stubSeq.toString().padStart(4, '0')}`,
      status: 'stubbed',
      baseModel: request.baseModel,
      samples: request.dataset.length,
      weightsUri: null,
      reason: 'TINKER_API_KEY missing — live Tinker ServiceClient attaches when credentials exist',
    };
    this.jobs.set(job.id, job);
    return job;
  }

  async get(jobId: string): Promise<TinkerJob | undefined> {
    return this.jobs.get(jobId);
  }
}

/**
 * Credential present in this process. Tinker is a Python SDK (ServiceClient);
 * EARTH records the job intent. A worker must pick it up — no fake LoRA run.
 */
export class CredentialedTinkerClient implements TinkerClient {
  readonly mode = 'credentialed' as const;
  private readonly jobs = new Map<string, TinkerJob>();
  private seq = 0;

  async submit(request: TinkerJobRequest): Promise<TinkerJob> {
    this.seq += 1;
    const job: TinkerJob = {
      id: `tinker-queued-${this.seq.toString().padStart(4, '0')}`,
      status: 'queued',
      baseModel: request.baseModel,
      samples: request.dataset.length,
      weightsUri: null,
      reason: 'Tinker credentials present; job queued for Python ServiceClient worker (not executed in-kernel)',
    };
    this.jobs.set(job.id, job);
    return job;
  }

  async get(jobId: string): Promise<TinkerJob | undefined> {
    return this.jobs.get(jobId);
  }
}

export function tinkerStatusLabel(status: TinkerJobStatus): string {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'stubbed':
      return 'stubbed';
    default:
      return assertNever(status, 'unhandled Tinker job status');
  }
}
