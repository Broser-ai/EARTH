import { z } from 'zod';
import { findUnsafePayloadField } from '../policy.js';
import type { IntegrationPolicyDecision } from '../types.js';

const ALLOWED_PAYLOAD_KEYS = new Set(['briefingdigestsha256', 'briefingref', 'maxchars']);

const DISTRIBUTION_KEYS = new Set([
  'publish',
  'distribute',
  'webhookurl',
  'webhook_url',
  'channel',
  'email',
  'slack',
  'teams',
  'callbackurl',
  'callback_url',
]);

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /\+\d{8,15}|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const SCRIPT_RE = /<script/i;
const JAVASCRIPT_URI_RE = /javascript:/i;
const ONERROR_RE = /onerror\s*=/i;

const heyGenPayloadSchema = z
  .object({
    briefingDigestSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
    briefingRef: z
      .string()
      .regex(/^earth:\/\/internal\/[A-Za-z0-9][A-Za-z0-9/_-]*$/)
      .max(220),
    maxChars: z.number().int().positive().max(2_000).optional(),
  })
  .strict();

export function validateHeyGenDraftPayload(
  payload: Record<string, unknown>,
): IntegrationPolicyDecision {
  const unsafe = findUnsafePayloadField(payload);
  if (unsafe) {
    return deny('UNSAFE_PAYLOAD_FIELD', `payload must not include ${unsafe}`);
  }

  for (const key of Object.keys(payload)) {
    const normalized = normalizeKey(key);
    if (DISTRIBUTION_KEYS.has(normalized) || DISTRIBUTION_KEYS.has(key.toLowerCase())) {
      return deny('UNSAFE_PAYLOAD_FIELD', `payload must not include ${key}`);
    }
    if (!ALLOWED_PAYLOAD_KEYS.has(normalized)) {
      return deny('UNSAFE_PAYLOAD_FIELD', `payload must not include ${key}`);
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string' && containsForbiddenContent(value, key)) {
      return deny('UNSAFE_PAYLOAD_FIELD', `payload field ${key} contains forbidden content`);
    }
  }

  const parsed = heyGenPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return deny(
      'SCHEMA_VALIDATION_FAILED',
      parsed.error.issues[0]?.message ?? 'HeyGen payload must be a sanitized briefing digest/ref',
    );
  }

  return {
    allowed: true,
    reasonCode: 'PROVIDER_NOT_CONFIGURED',
    message: 'HeyGen draft payload schema ok',
    resultingState: 'REQUESTED',
    providerStatus: 'NOT_CONFIGURED',
  };
}

function containsForbiddenContent(value: string, key: string): boolean {
  if (SCRIPT_RE.test(value) || JAVASCRIPT_URI_RE.test(value) || ONERROR_RE.test(value)) {
    return true;
  }
  if (normalizeKey(key) === 'briefingdigestsha256') {
    return false;
  }
  if (EMAIL_RE.test(value)) {
    return true;
  }
  const compact = value.replace(/[\s()-]/g, '');
  if (PHONE_RE.test(value) || PHONE_RE.test(compact)) {
    return true;
  }
  return false;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function deny(
  reasonCode: IntegrationPolicyDecision['reasonCode'],
  message: string,
): IntegrationPolicyDecision {
  return {
    allowed: false,
    reasonCode,
    message,
    resultingState: 'BLOCKED',
    providerStatus: 'DISABLED',
  };
}
