import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { TenantContext } from '../auth/types.js';
import { digest } from './core/digest.js';
import {
  INTEGRATION_CONTROL_PLANE_VERSION,
  type IntegrationAuditEventType,
  type IntegrationOperationState,
  type IntegrationProviderKey,
} from './types.js';

const AUDIT_POLICY_VERSION = INTEGRATION_CONTROL_PLANE_VERSION;

export type IntegrationAuditInsert = {
  eventType: IntegrationAuditEventType;
  previousState?: IntegrationOperationState | null;
  nextState?: IntegrationOperationState | null;
  providerKey: IntegrationProviderKey | 'UNKNOWN';
  operationType?: string;
  operationId?: string | null;
  requestDigest?: string | null;
  outputDigest?: string | null;
  reasonCode?: string | null;
  metadata?: Record<string, unknown>;
};

export async function insertIntegrationAuditEvent(
  client: PoolClient,
  context: TenantContext,
  event: IntegrationAuditInsert,
): Promise<string> {
  const id = randomUUID();
  const metadata = sanitizeAuditMetadata({
    ...(event.metadata ?? {}),
    authMode: context.authMode,
    correlationId: context.correlationId,
    providerKey: event.providerKey,
    operationType: event.operationType ?? null,
    operationId: event.operationId ?? null,
    reasonCode: event.reasonCode ?? null,
    healthCheck: event.eventType === 'INTEGRATION_HEALTH_CHECK_SKIPPED' ? 'SKIPPED' : undefined,
  });

  await client.query(
    `INSERT INTO audit_events (
      id, organization_id, session_id, task_id, actor_type, actor_id,
      event_type, previous_state, next_state, policy_version, auth_mode, correlation_id,
      input_digest, output_digest, metadata_json
    ) VALUES (
      $1, $2, NULL, NULL, 'USER', $3,
      $4, $5, $6, $7, $8, $9,
      $10, $11, $12::jsonb
    )`,
    [
      id,
      context.organizationId,
      context.actorId,
      event.eventType,
      event.previousState ?? null,
      event.nextState ?? null,
      AUDIT_POLICY_VERSION,
      context.authMode,
      context.correlationId,
      event.requestDigest ?? null,
      event.outputDigest ?? null,
      JSON.stringify(metadata),
    ],
  );
  return id;
}

export function requestDigestFor(value: unknown): string {
  return digest(value);
}

const FORBIDDEN_AUDIT_KEYS = [
  'apiKey',
  'api_key',
  'token',
  'secret',
  'password',
  'authorization',
  'client_secret',
  'refresh_token',
  'access_token',
  'id_token',
  'jwt',
  'bearer',
  'rawPrompt',
  'rawDocument',
  'imageData',
  'payload',
  'payloadReference',
  'providerResponse',
  'headers',
  'authorizationHeader',
];

function sanitizeAuditMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) {
      continue;
    }
    if (FORBIDDEN_AUDIT_KEYS.includes(key) || /secret|token|password|apikey|jwt|prompt|document|image/i.test(key)) {
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      continue;
    }
    clean[key] = value;
  }
  return clean;
}
