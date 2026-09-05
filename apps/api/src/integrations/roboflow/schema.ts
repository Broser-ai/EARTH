import { z } from 'zod';
import { findUnsafePayloadField } from '../policy.js';
import { assertNever } from '../../contracts.js';
import type { IntegrationReasonCode } from '../types.js';

export const MAX_IMAGE_BYTES = 8_388_608;
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;

export const INTERNAL_OBJECT_REF_RE = /^(earth:\/\/internal\/|earth:\/\/object\/)/;

export const ROBOFLOW_DRAFT_STATUSES = [
  'DRAFT',
  'ABSTAINED',
  'REQUIRES_HUMAN_REVIEW',
  'NOT_CONFIGURED',
] as const;
export type RoboflowDraftStatus = (typeof ROBOFLOW_DRAFT_STATUSES)[number];

export interface RoboflowDraftResult {
  labels: string[];
  confidence: number;
  modelVersion: string;
  operationId: string;
  status: RoboflowDraftStatus;
}

export interface ParsedInferencePayload {
  objectStorageRef: string;
  byteLength: number;
  confidenceThreshold: number;
}

export interface PayloadValidationFailure {
  ok: false;
  reasonCode: IntegrationReasonCode;
  message: string;
}

export interface PayloadValidationSuccess {
  ok: true;
  value: ParsedInferencePayload;
}

const inferenceFieldsSchema = z.object({
  objectStorageRef: z.string().min(1),
  byteLength: z.number(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
});

const SSRF_SCHEME_RE = /^\s*(https?:|data:|file:|ftp:|gopher:|javascript:)/i;

export function validateInferencePayload(
  payload: Record<string, unknown>,
): PayloadValidationSuccess | PayloadValidationFailure {
  const unsafe = findUnsafePayloadField(payload);
  if (unsafe) {
    return {
      ok: false,
      reasonCode: 'UNSAFE_PAYLOAD_FIELD',
      message: 'payload contains a forbidden field',
    };
  }

  const ssrf = findSsrfValue(payload);
  if (ssrf) {
    return {
      ok: false,
      reasonCode: 'SCHEMA_VALIDATION_FAILED',
      message: 'payload must not include http(s), data URIs, or other remote fetch targets',
    };
  }

  if (hasRawImageMaterial(payload)) {
    return {
      ok: false,
      reasonCode: 'UNSAFE_PAYLOAD_FIELD',
      message: 'payload must not include image bytes or data URIs',
    };
  }

  const parsed = inferenceFieldsSchema.safeParse(payload);
  if (!parsed.success) {
    const missingByteLength = payload.byteLength === undefined || payload.byteLength === null;
    return {
      ok: false,
      reasonCode: 'SCHEMA_VALIDATION_FAILED',
      message: missingByteLength
        ? 'byteLength is required'
        : 'objectStorageRef and numeric byteLength are required',
    };
  }

  const { objectStorageRef, byteLength, confidenceThreshold } = parsed.data;

  if (!INTERNAL_OBJECT_REF_RE.test(objectStorageRef)) {
    return {
      ok: false,
      reasonCode: 'SCHEMA_VALIDATION_FAILED',
      message: 'objectStorageRef must match earth://internal/ or earth://object/',
    };
  }

  if (!Number.isFinite(byteLength) || !Number.isInteger(byteLength) || byteLength <= 0) {
    return {
      ok: false,
      reasonCode: 'SCHEMA_VALIDATION_FAILED',
      message: 'byteLength must be a positive integer',
    };
  }

  if (byteLength > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      reasonCode: 'PAYLOAD_TOO_LARGE',
      message: `byteLength exceeds ${MAX_IMAGE_BYTES} (8 MiB)`,
    };
  }

  return {
    ok: true,
    value: {
      objectStorageRef,
      byteLength,
      confidenceThreshold: confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
    },
  };
}

export function draftStatusFromConfidence(
  confidence: number,
  threshold: number,
  labels: string[],
): RoboflowDraftStatus {
  if (labels.length === 0) {
    return 'REQUIRES_HUMAN_REVIEW';
  }
  if (confidence < threshold) {
    return confidence < threshold * 0.5 ? 'ABSTAINED' : 'REQUIRES_HUMAN_REVIEW';
  }
  return 'DRAFT';
}

export function assertRoboflowDraftStatus(status: RoboflowDraftStatus): RoboflowDraftStatus {
  switch (status) {
    case 'DRAFT':
    case 'ABSTAINED':
    case 'REQUIRES_HUMAN_REVIEW':
    case 'NOT_CONFIGURED':
      return status;
    default:
      return assertNever(status);
  }
}

export function parseDraftResult(safeSummary: string | null): RoboflowDraftResult | null {
  if (!safeSummary) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(safeSummary);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (!isDraftStatus(record.status)) {
      return null;
    }
    return {
      labels: Array.isArray(record.labels)
        ? record.labels.filter((item): item is string => typeof item === 'string')
        : [],
      confidence: typeof record.confidence === 'number' ? record.confidence : 0,
      modelVersion: typeof record.modelVersion === 'string' ? record.modelVersion : 'unspecified-draft',
      operationId: typeof record.operationId === 'string' ? record.operationId : '',
      status: assertRoboflowDraftStatus(record.status),
    };
  } catch {
    return null;
  }
}

export function isCapabilityBody(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.models)) {
    return true;
  }
  if (Array.isArray(record.capabilities)) {
    return record.capabilities.some(
      (item) => item === 'MATERIAL_IMAGE_INFERENCE' || item === 'detect' || item === 'classification',
    );
  }
  return false;
}

export function parseInferenceBody(value: unknown): {
  labels: string[];
  confidence: number;
  modelVersion: string;
} {
  if (!value || typeof value !== 'object') {
    return { labels: [], confidence: 0, modelVersion: 'unspecified-draft' };
  }
  const record = value as Record<string, unknown>;
  const labels: string[] = [];
  let confidence = 0;

  if (Array.isArray(record.labels)) {
    for (const item of record.labels) {
      if (typeof item === 'string' && item.length > 0) {
        labels.push(item);
      }
    }
  }

  if (Array.isArray(record.predictions)) {
    for (const prediction of record.predictions) {
      if (!prediction || typeof prediction !== 'object') {
        continue;
      }
      const row = prediction as Record<string, unknown>;
      const label =
        typeof row.class === 'string'
          ? row.class
          : typeof row.label === 'string'
            ? row.label
            : null;
      if (label) {
        labels.push(label);
      }
      if (typeof row.confidence === 'number' && Number.isFinite(row.confidence)) {
        confidence = Math.max(confidence, row.confidence);
      }
    }
  }

  if (typeof record.confidence === 'number' && Number.isFinite(record.confidence)) {
    confidence = Math.max(confidence, record.confidence);
  }

  const modelVersion =
    typeof record.modelVersion === 'string'
      ? record.modelVersion
      : typeof record.model === 'string'
        ? record.model
        : 'unspecified-draft';

  return {
    labels: [...new Set(labels)],
    confidence,
    modelVersion,
  };
}

function isDraftStatus(value: unknown): value is RoboflowDraftStatus {
  return (
    value === 'DRAFT' ||
    value === 'ABSTAINED' ||
    value === 'REQUIRES_HUMAN_REVIEW' ||
    value === 'NOT_CONFIGURED'
  );
}

function findSsrfValue(value: unknown): string | null {
  if (typeof value === 'string') {
    if (SSRF_SCHEME_RE.test(value) || /https?:\/\//i.test(value)) {
      return value;
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findSsrfValue(item);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const found = findSsrfValue(item);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function hasRawImageMaterial(payload: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(payload)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (
      normalized === 'image' ||
      normalized === 'imagebytes' ||
      normalized === 'bytes' ||
      normalized === 'datauri' ||
      normalized === 'dataurl'
    ) {
      return true;
    }
    if (typeof value === 'string' && value.startsWith('data:')) {
      return true;
    }
  }
  return false;
}
