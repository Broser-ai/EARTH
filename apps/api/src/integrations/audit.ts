import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { AuthMode } from '../auth/types.js';
import { insertAuditEvent } from '../prime/audit.js';
import {
  INTEGRATION_AUDIT_EVENTS,
  type IntegrationAuditEventType,
  type IntegrationOperation,
  type IntegrationProviderKey,
} from './types.js';

const FORBIDDEN_METADATA_KEYS = [
  'prompt',
  'rawimage',
  'raw_image',
  'image',
  'document',
  'documents',
  'payload',
  'body',
  'headers',
  'authorization',
  'apikey',
  'api_key',
  'token',
  'access_token',
  'secret',
  'password',
  'response',
  'providerresponse',
  'provider_response',
];

export interface IntegrationAuditInput {
  organizationId: string;
  actorId: string;
  authMode: AuthMode;
  eventType: IntegrationAuditEventType;
  providerKey: IntegrationProviderKey;
  operation?: Pick<
    IntegrationOperation,
    'id' | 'state' | 'operationType' | 'purpose' | 'dataClassification' | 'idempotencyKey'
  > | null;
  previousState?: string | null;
  nextState?: string | null;
  reasonCode?: string | null;
  extra?: Record<string, unknown>;
}

export async function writeIntegrationAudit(
  client: PoolClient,
  event: IntegrationAuditInput,
): Promise<string> {
  const metadata = sanitizeAuditMetadata({
    providerKey: event.providerKey,
    operationId: event.operation?.id ?? null,
    operationType: event.operation?.operationType ?? null,
    purpose: event.operation?.purpose ?? null,
    dataClassification: event.operation?.dataClassification ?? null,
    reasonCode: event.reasonCode ?? null,
    idempotencyKeyPresent: Boolean(event.operation?.idempotencyKey),
    ...(event.extra ?? {}),
  });

  return insertAuditEvent(client, {
    organizationId: event.organizationId,
    actorType: 'USER',
    actorId: event.actorId,
    authMode: event.authMode,
    eventType: event.eventType,
    previousState: event.previousState ?? null,
    nextState: event.nextState ?? event.operation?.state ?? null,
    metadata,
  });
}

export function sanitizeAuditMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (isForbiddenMetadataKey(key)) {
      continue;
    }
    if (typeof value === 'string' && looksLikeSecret(value)) {
      continue;
    }
    if (value && typeof value === 'object') {
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

export function digestRequest(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function newAuditId(): string {
  return randomUUID();
}

export function isIntegrationAuditEvent(eventType: string): eventType is IntegrationAuditEventType {
  return (INTEGRATION_AUDIT_EVENTS as readonly string[]).includes(eventType);
}

function isForbiddenMetadataKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return FORBIDDEN_METADATA_KEYS.includes(normalized) || FORBIDDEN_METADATA_KEYS.includes(key.toLowerCase());
}

function looksLikeSecret(value: string): boolean {
  if (value.length >= 24 && /[A-Za-z0-9_\-]{24,}/.test(value)) {
    return true;
  }
  if (/^(sk-|rf_|hf_|hg_|Bearer\s)/i.test(value)) {
    return true;
  }
  return false;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    sorted[key] = sortValue(record[key]);
  }
  return sorted;
}
