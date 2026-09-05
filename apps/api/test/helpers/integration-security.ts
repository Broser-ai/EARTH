import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AUTH_MODE_DEVELOPMENT, type TenantContext } from '../../src/auth/types.js';
import { credentialEnvNames } from '../../src/integrations/config.js';
import { providerOutboundProbe } from '../../src/integrations/core/probe.js';
import {
  PROVIDER_OPERATION_TYPES,
  type IntegrationProviderKey,
  type IntegrationPurpose,
} from '../../src/integrations/types.js';
import { DEV_ORG, DEV_USER, OTHER_ORG } from '../helpers.js';

export interface ProviderContractFixture {
  providerKey: IntegrationProviderKey;
  operationType: string;
  purpose: IntegrationPurpose;
  payload: Record<string, unknown>;
  credentialEnv: string | null;
  enableEnv: string;
}

export const PROVIDER_CONTRACTS: readonly ProviderContractFixture[] = [
  {
    providerKey: 'ROBOFLOW',
    operationType: 'MATERIAL_IMAGE_INFERENCE',
    purpose: 'MATERIAL_IMAGE_INFERENCE',
    payload: { objectStorageRef: 'earth://internal/img-1' },
    credentialEnv: 'EARTH_INTEGRATION_ROBOFLOW_API_KEY',
    enableEnv: 'EARTH_INTEGRATION_ROBOFLOW_ENABLED',
  },
  {
    providerKey: 'HUGGINGFACE',
    operationType: 'MODEL_CATALOG_LOOKUP',
    purpose: 'MODEL_CATALOG_LOOKUP',
    payload: { modelId: 'earth-internal/material-classifier' },
    credentialEnv: 'EARTH_INTEGRATION_HUGGINGFACE_TOKEN',
    enableEnv: 'EARTH_INTEGRATION_HUGGINGFACE_ENABLED',
  },
  {
    providerKey: 'TINKER',
    operationType: 'TINKER_TRAINING_JOB_REQUEST',
    purpose: 'TINKER_TRAINING_JOB_REQUEST',
    payload: { jobIntent: 'request-training-draft' },
    credentialEnv: 'EARTH_INTEGRATION_TINKER_API_KEY',
    enableEnv: 'EARTH_INTEGRATION_TINKER_ENABLED',
  },
  {
    providerKey: 'INKLING',
    operationType: 'INKLING_POLICY_ARTIFACT_REQUEST',
    purpose: 'INKLING_POLICY_ARTIFACT_REQUEST',
    payload: { artifactRef: 'earth://internal/policy-draft' },
    credentialEnv: 'EARTH_INTEGRATION_INKLING_WEIGHTS_URI',
    enableEnv: 'EARTH_INTEGRATION_INKLING_ENABLED',
  },
  {
    providerKey: 'HEYGEN',
    operationType: 'EXECUTIVE_VIDEO_DRAFT_REQUEST',
    purpose: 'EXECUTIVE_VIDEO_DRAFT_REQUEST',
    payload: { scriptRef: 'earth://internal/script-draft' },
    credentialEnv: 'EARTH_INTEGRATION_HEYGEN_API_KEY',
    enableEnv: 'EARTH_INTEGRATION_HEYGEN_ENABLED',
  },
  {
    providerKey: 'LANGGRAPH',
    operationType: 'PRIME_WORKFLOW_PROJECTION',
    purpose: 'PRIME_WORKFLOW_PROJECTION',
    payload: { projectionScope: 'prime-read-only' },
    credentialEnv: null,
    enableEnv: 'EARTH_INTEGRATION_LANGGRAPH_ENABLED',
  },
];

export const ENV_KEY_SECRETS: Record<Exclude<IntegrationProviderKey, 'LANGGRAPH'>, string> = {
  ROBOFLOW: 'rf_contract_secret_do_not_leak_xx',
  HUGGINGFACE: 'hf_contract_secret_do_not_leak_xx',
  TINKER: 'tk_contract_secret_do_not_leak_xx',
  INKLING: 'earth://weights/inkling-contract-uri',
  HEYGEN: 'hg_contract_secret_do_not_leak_xx',
};

const CLAIM_RELATION_CANDIDATES = [
  'claims',
  'evidence',
  'evidence_records',
  'evidence_items',
  'verified_claims',
  'claim_approvals',
] as const;

export function contractTenant(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    organizationId: DEV_ORG,
    actorId: DEV_USER,
    role: 'OWNER',
    authMode: AUTH_MODE_DEVELOPMENT,
    correlationId: 'integration-contract',
    ...overrides,
  };
}

export function operationUrl(providerKey: IntegrationProviderKey): string {
  return `/v1/integrations/${providerKey}/operations`;
}

export function statusUrl(providerKey: IntegrationProviderKey): string {
  return `/v1/integrations/${providerKey}/status`;
}

export function createOperationPayload(fixture: ProviderContractFixture, idempotencyKey: string) {
  return {
    operationType: fixture.operationType,
    purpose: fixture.purpose,
    dataClassification: 'INTERNAL' as const,
    idempotencyKey,
    payload: fixture.payload,
  };
}

export async function insertTenantIntegrationPolicy(
  pool: Pool,
  args: {
    organizationId: string;
    providerKey: IntegrationProviderKey;
    enabled?: boolean;
    allowedDataClassifications?: string[];
    allowedPurposes?: string[];
  },
): Promise<void> {
  const fixture = PROVIDER_CONTRACTS.find((row) => row.providerKey === args.providerKey);
  if (!fixture) {
    throw new Error(`unknown provider fixture: ${args.providerKey}`);
  }
  await pool.query(
    `INSERT INTO tenant_integration_policies (
       id, organization_id, provider_key, enabled,
       allowed_data_classifications, allowed_purposes, require_human_approval
     ) VALUES (
       gen_random_uuid(), $1, $2, $3,
       $4::text[], $5::text[], true
     )`,
    [
      args.organizationId,
      args.providerKey,
      args.enabled ?? true,
      args.allowedDataClassifications ?? ['INTERNAL'],
      args.allowedPurposes ?? [fixture.purpose],
    ],
  );
}

export function assertNoConnected(value: unknown): void {
  const text = JSON.stringify(value);
  expect(text).not.toContain('"connected":true');
  expect(text).not.toContain('"status":"CONNECTED"');
  expect(text).not.toMatch(/"state"\s*:\s*"CONNECTED"/);
}

export function assertNeverVerified(value: unknown): void {
  const text = JSON.stringify(value);
  expect(text).not.toContain('"VERIFIED"');
  expect(text).not.toMatch(/"claimStatus"\s*:\s*"VERIFIED"/i);
  expect(text).not.toMatch(/(?<![A-Z_])VERIFIED(?![A-Z_])/);
  assertNoConnected(value);
}

export function assertNoSecretLeak(value: unknown, secrets: readonly string[] = []): void {
  const text = JSON.stringify(value);
  expect(text).not.toMatch(/Bearer /);
  expect(text).not.toMatch(/VITE_/);
  expect(text).not.toContain('localStorage');
  for (const secret of secrets) {
    expect(text).not.toContain(secret);
  }
}

export function assertNoOutboundHttp(): void {
  expect(providerOutboundProbe.calls).toBe(0);
  expect(providerOutboundProbe.lastUrl).toBeNull();
}

export function installForbiddenFetch(): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    throw new Error(`direct provider HTTP is forbidden in contract tests: ${url}`);
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

export async function relationExists(pool: Pool, tableName: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName],
  );
  return result.rows[0]?.exists === true;
}

export async function assertNoClaimSideEffects(pool: Pool): Promise<void> {
  for (const name of CLAIM_RELATION_CANDIDATES) {
    if (!(await relationExists(pool, name))) {
      continue;
    }
    const count = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${name}`);
    expect(count.rows[0]?.n ?? 0).toBe(0);
  }
}

export async function sessionState(pool: Pool, sessionId: string): Promise<string> {
  const result = await pool.query<{ state: string }>(
    `SELECT state FROM execution_sessions WHERE id = $1`,
    [sessionId],
  );
  expect(result.rowCount).toBe(1);
  return result.rows[0].state;
}

export async function truncateIntegrationLedger(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE integration_operations, tenant_integration_policies');
  await pool.query(`DELETE FROM audit_events WHERE event_type LIKE 'INTEGRATION_%'`);
}

export async function auditEventTypes(pool: Pool, organizationId: string): Promise<string[]> {
  const events = await pool.query<{ event_type: string }>(
    `SELECT event_type FROM audit_events
     WHERE organization_id = $1 AND event_type LIKE 'INTEGRATION_%'
     ORDER BY created_at ASC`,
    [organizationId],
  );
  return events.rows.map((row) => row.event_type);
}

export function repoRootFrom(metaUrl: string): string {
  return resolve(dirname(fileURLToPath(metaUrl)), '../../../../../');
}

export function runIntegrationSecurityScan(root: string): { status: number; stdout: string } {
  try {
    const stdout = execFileSync('node', ['scripts/integration-security-scan.mjs'], {
      cwd: root,
      encoding: 'utf8',
    });
    return { status: 0, stdout };
  } catch (error) {
    const err = error as { status?: number | null; stdout?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? '' };
  }
}

export function expectedOperationTypes(providerKey: IntegrationProviderKey): readonly string[] {
  return PROVIDER_OPERATION_TYPES[providerKey];
}

export function credentialNamesFor(providerKey: IntegrationProviderKey): readonly string[] {
  return credentialEnvNames(providerKey);
}

export async function postOperation(
  app: FastifyInstance,
  fixture: ProviderContractFixture,
  args: {
    headers: Record<string, string>;
    idempotencyKey: string;
    payload?: Record<string, unknown>;
    extraBody?: Record<string, unknown>;
    dataClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  },
) {
  return app.inject({
    method: 'POST',
    url: operationUrl(fixture.providerKey),
    headers: args.headers,
    payload: {
      ...createOperationPayload(fixture, args.idempotencyKey),
      ...(args.dataClassification ? { dataClassification: args.dataClassification } : {}),
      ...(args.payload ? { payload: args.payload } : {}),
      ...(args.extraBody ?? {}),
    },
  });
}

export { DEV_ORG, DEV_USER, OTHER_ORG };
