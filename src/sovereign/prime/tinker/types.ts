import type { PolicyKind } from '../../types.ts';

export type TinkerJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'stubbed';

export interface TinkerDatum {
  trajectoryId: string;
  missionId: string;
  reward: number;
  decisionKind: PolicyKind;
  lessonId?: string;
}

export interface TinkerJobRequest {
  baseModel: string;
  loraRank: number;
  dataset: TinkerDatum[];
  lessonId?: string;
}

export interface TinkerJob {
  id: string;
  status: TinkerJobStatus;
  baseModel: string;
  samples: number;
  weightsUri: string | null;
  reason: string;
}

export type TinkerClientMode = 'stub' | 'credentialed';
