import { z } from 'zod';
import { findUnsafePayloadField } from '../policy.js';

const SHA256_RE = /^[a-fA-F0-9]{64}$/;

const EXTRA_UNSAFE_KEYS = new Set([
  'liveinference',
  'live_inference',
  'trained',
  'trainedweights',
  'trained_weights',
  'weightsuri',
  'weights_uri',
  'weights',
  'bonsai',
  'projectbonsai',
  'project_bonsai',
  'sessionrlpolicy',
  'rlpolicy',
  'policynetwork',
  'policy_network',
]);

export const inklingPayloadSchema = z
  .object({
    artifactDigestSha256: z.string().regex(SHA256_RE),
    artifactRef: z.string().min(1).max(500),
  })
  .strict();

export type InklingPayload = z.infer<typeof inklingPayloadSchema>;

export function isInternalEarthRef(value: string): boolean {
  if (!value.startsWith('earth://internal/')) {
    return false;
  }
  if (value.includes('..') || /[?#\s]/.test(value)) {
    return false;
  }
  return value.length > 'earth://internal/'.length;
}

export function findInklingUnsafeField(payload: Record<string, unknown>): string | null {
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

export function parseInklingPayload(
  payload: Record<string, unknown>,
): { ok: true; value: InklingPayload } | { ok: false; field?: string } {
  const unsafe = findInklingUnsafeField(payload);
  if (unsafe) {
    return { ok: false, field: unsafe };
  }
  const parsed = inklingPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false };
  }
  if (!isInternalEarthRef(parsed.data.artifactRef)) {
    return { ok: false };
  }
  return { ok: true, value: parsed.data };
}
