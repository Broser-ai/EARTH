import { z } from 'zod';
import { findUnsafePayloadField } from '../policy.js';
import { isAllowListedModelReference } from './allowlist.js';

const SHA256_RE = /^[a-fA-F0-9]{64}$/;

const EXTRA_UNSAFE_KEYS = new Set([
  'dataset',
  'data',
  'trajectories',
  'samples',
  'rewards',
  'reward',
  'weights',
  'weightsuri',
  'weights_uri',
  'sessionrlpolicy',
  'rlpolicy',
  'trainingdata',
  'training_data',
  'rawdata',
  'raw_data',
  'corpus',
  'episodes',
  'lesson',
  'lora',
  'finetune',
]);

export const tinkerPayloadSchema = z
  .object({
    datasetDigestSha256: z.string().regex(SHA256_RE),
    approvedDatasetRef: z.string().min(1).max(500),
    modelReference: z.string().min(1).max(120),
    purpose: z.string().max(80).optional(),
    estimatedCostDkk: z.number().nonnegative().max(1_000_000).optional(),
  })
  .strict();

export type TinkerPayload = z.infer<typeof tinkerPayloadSchema>;

export function isInternalEarthRef(value: string): boolean {
  if (!value.startsWith('earth://internal/')) {
    return false;
  }
  if (value.includes('..') || /[?#\s]/.test(value)) {
    return false;
  }
  return value.length > 'earth://internal/'.length;
}

export function findTinkerUnsafeField(payload: Record<string, unknown>): string | null {
  const policyHit = findUnsafePayloadField(payload);
  if (policyHit) {
    return policyHit;
  }
  for (const key of Object.keys(payload)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (EXTRA_UNSAFE_KEYS.has(normalized) || EXTRA_UNSAFE_KEYS.has(key.toLowerCase())) {
      return key;
    }
  }
  return null;
}

export function parseTinkerPayload(
  payload: Record<string, unknown>,
  allowListedModelReferences: readonly string[],
): { ok: true; value: TinkerPayload } | { ok: false; field?: string } {
  const unsafe = findTinkerUnsafeField(payload);
  if (unsafe) {
    return { ok: false, field: unsafe };
  }
  const parsed = tinkerPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false };
  }
  if (!isInternalEarthRef(parsed.data.approvedDatasetRef)) {
    return { ok: false };
  }
  if (!isAllowListedModelReference(parsed.data.modelReference, allowListedModelReferences)) {
    return { ok: false, field: 'modelReference' };
  }
  return { ok: true, value: parsed.data };
}
