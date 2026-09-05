import type { AdapterCapabilities, IntegrationProviderKey } from '../types.js';

export const DEFAULT_INTEGRATION_TIMEOUT_MS = 10_000;
export const MIN_INTEGRATION_TIMEOUT_MS = 1_000;
export const MAX_INTEGRATION_TIMEOUT_MS = 30_000;

export const AUTONOMOUS_OPERATION_TYPES = new Set([
  'BOOK',
  'BOOKING',
  'BOOKING_SLOT',
  'PAY',
  'PAYMENT',
  'PURCHASE',
  'SUBMIT',
  'SUBMISSION',
  'APPROVE',
  'APPROVAL',
  'CHECKOUT',
  'CHARGE',
]);

const AUTONOMOUS_PAYLOAD_KEYS = new Set([
  'book',
  'booking',
  'pay',
  'payment',
  'purchase',
  'approve',
  'approval',
  'submit',
  'submission',
  'checkout',
  'charge',
]);

const UNSAFE_PAYLOAD_KEYS = new Set([
  'apikey',
  'api_key',
  'token',
  'access_token',
  'authorization',
  'password',
  'secret',
  'privatekey',
  'private_key',
]);

export const PROVIDER_OPERATION_TYPES: Record<IntegrationProviderKey, readonly string[]> = {
  ROBOFLOW: ['VISION_INSPECT', 'MATERIAL_IMAGE_INFERENCE'],
  HUGGINGFACE: ['VISION_INSPECT', 'MODEL_CARD_LOOKUP', 'MODEL_CATALOG_LOOKUP', 'APPROVED_INFERENCE_REQUEST'],
  TINKER: ['VISION_INSPECT', 'TINKER_TRAINING_JOB_REQUEST'],
  INKLING: ['VISION_INSPECT', 'INKLING_POLICY_ARTIFACT_REQUEST'],
  HEYGEN: ['VISION_INSPECT', 'EXECUTIVE_VIDEO_DRAFT_REQUEST'],
  LANGGRAPH: ['VISION_INSPECT', 'PRIME_WORKFLOW_PROJECTION'],
};

export function defaultAdapterCapabilities(providerKey: IntegrationProviderKey): AdapterCapabilities {
  return {
    allowedOperations: PROVIDER_OPERATION_TYPES[providerKey],
    externalDataTransfer: false,
    autonomousActions: false,
    maxTimeoutMs: DEFAULT_INTEGRATION_TIMEOUT_MS,
    maxAttempts: 1,
  };
}

export function clampIntegrationTimeoutMs(requested?: number): number {
  if (requested === undefined || !Number.isFinite(requested)) {
    return DEFAULT_INTEGRATION_TIMEOUT_MS;
  }
  return Math.min(
    MAX_INTEGRATION_TIMEOUT_MS,
    Math.max(MIN_INTEGRATION_TIMEOUT_MS, Math.floor(requested)),
  );
}

export function isAutonomousOperationType(operationType: string): boolean {
  const normalized = operationType.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (AUTONOMOUS_OPERATION_TYPES.has(normalized)) {
    return true;
  }
  return normalized
    .split('_')
    .filter(Boolean)
    .some((token) => AUTONOMOUS_OPERATION_TYPES.has(token));
}

export function findAutonomousPayloadField(payload: Record<string, unknown> | undefined): string | null {
  if (!payload) {
    return null;
  }
  for (const key of Object.keys(payload)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (AUTONOMOUS_PAYLOAD_KEYS.has(normalized) || AUTONOMOUS_PAYLOAD_KEYS.has(key.toLowerCase())) {
      return key;
    }
  }
  return null;
}

export function findUnsafePayloadField(payload: Record<string, unknown> | undefined): string | null {
  if (!payload) {
    return null;
  }
  for (const key of Object.keys(payload)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (UNSAFE_PAYLOAD_KEYS.has(normalized) || UNSAFE_PAYLOAD_KEYS.has(key.toLowerCase())) {
      return key;
    }
  }
  return null;
}
