import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { AuthMode } from '../auth/types.js';
import { POLICY_VERSION, type ActorType } from './types.js';

export function digest(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function stableStringify(value: unknown): string {
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

export interface AuditInsert {
  organizationId: string;
  sessionId?: string | null;
  taskId?: string | null;
  actorType: ActorType;
  actorId: string;
  authMode: AuthMode;
  eventType: string;
  previousState?: string | null;
  nextState?: string | null;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
}

export async function insertAuditEvent(client: PoolClient, event: AuditInsert): Promise<string> {
  const id = randomUUID();
  const metadata = {
    ...(event.metadata ?? {}),
    authMode: event.authMode,
  };
  await client.query(
    `INSERT INTO audit_events (
      id, organization_id, session_id, task_id, actor_type, actor_id,
      event_type, previous_state, next_state, policy_version,
      input_digest, output_digest, metadata_json, auth_mode
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13::jsonb, $14
    )`,
    [
      id,
      event.organizationId,
      event.sessionId ?? null,
      event.taskId ?? null,
      event.actorType,
      event.actorId,
      event.eventType,
      event.previousState ?? null,
      event.nextState ?? null,
      POLICY_VERSION,
      event.input === undefined ? null : digest(event.input),
      event.output === undefined ? null : digest(event.output),
      JSON.stringify(metadata),
      event.authMode,
    ],
  );
  return id;
}
