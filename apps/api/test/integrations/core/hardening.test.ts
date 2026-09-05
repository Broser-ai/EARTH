import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AUTH_MODE_DEVELOPMENT } from '../../../src/auth/types.js';
import { IntegrationNotImplementedError } from '../../../src/integrations/core/errors.js';
import { IntegrationControlService } from '../../../src/integrations/core/service.js';
import { probeProviderConfig } from '../../../src/integrations/config.js';
import {
  FORBIDDEN_PROVIDER_SIDE_EFFECTS,
  INTEGRATION_CONTROL_PLANE_VERSION,
} from '../../../src/integrations/types.js';
import {
  createPool,
  createTestApp,
  DEV_ESG_LEAD,
  DEV_OPERATIONS,
  DEV_ORG,
  DEV_REVIEWER,
  DEV_USER,
  DEV_VIEWER,
  jsonHasSecretLike,
  operationPayload,
  OTHER_ORG,
  otherHeaders,
  resetIntegrationTables,
  roleHeaders,
  upsertTenantPolicy,
} from './helpers.js';

const INTEGRATIONS_SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../src/integrations',
);

describe('Integration Control Plane hardening', () => {
  let pool: Pool;
  let app: FastifyInstance;
  let service: IntegrationControlService;

  beforeAll(async () => {
    pool = await createPool();
    app = await createTestApp(pool);
    service = new IntegrationControlService(pool);
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await resetIntegrationTables(pool);
  });

  it('does not apply tenant A adapter policy to tenant B', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'ROBOFLOW',
      enabled: true,
    });

    const tenantA = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: 'tenant-a-policy' }),
    });
    expect(tenantA.statusCode).toBe(201);
    expect(tenantA.json().operation.state).toBe('NOT_CONFIGURED');
    expect(tenantA.json().operation.organizationId).toBe(DEV_ORG);

    const tenantB = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: otherHeaders,
      payload: operationPayload({ idempotencyKey: 'tenant-b-no-policy' }),
    });
    expect(tenantB.statusCode).toBe(403);
    expect(tenantB.json().operation.state).toBe('BLOCKED');
    expect(tenantB.json().operation.errorCode).toBe('INTEGRATION_POLICY_MISSING');
    expect(tenantB.json().executed).toBe(false);

    const policies = await pool.query<{ organization_id: string; enabled: boolean }>(
      `SELECT organization_id, enabled FROM tenant_integration_policies WHERE provider_key = 'ROBOFLOW'`,
    );
    expect(policies.rows).toEqual([{ organization_id: DEV_ORG, enabled: true }]);
    expect(OTHER_ORG).not.toBe(DEV_ORG);
  });

  it('scopes idempotency per tenant and per provider', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'ROBOFLOW',
      enabled: true,
    });
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'HUGGINGFACE',
      enabled: true,
    });
    await upsertTenantPolicy(pool, {
      organizationId: OTHER_ORG,
      providerKey: 'ROBOFLOW',
      enabled: true,
    });

    const sharedKey = 'shared-idempotency-key';
    const tenantARoboflow = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: sharedKey }),
    });
    const tenantAHuggingFace = await app.inject({
      method: 'POST',
      url: '/v1/integrations/HUGGINGFACE/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: sharedKey }),
    });
    const tenantBRoboflow = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: otherHeaders,
      payload: operationPayload({ idempotencyKey: sharedKey }),
    });

    expect(tenantARoboflow.statusCode).toBe(201);
    expect(tenantAHuggingFace.statusCode).toBe(201);
    expect(tenantBRoboflow.statusCode).toBe(201);

    const ids = [
      tenantARoboflow.json().operation.id,
      tenantAHuggingFace.json().operation.id,
      tenantBRoboflow.json().operation.id,
    ];
    expect(new Set(ids).size).toBe(3);
    expect(tenantARoboflow.json().operation.organizationId).toBe(DEV_ORG);
    expect(tenantBRoboflow.json().operation.organizationId).toBe(OTHER_ORG);
    expect(tenantAHuggingFace.json().operation.providerKey).toBe('HUGGINGFACE');

    const replay = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: sharedKey,
        operationType: 'SHOULD_NOT_REPLACE',
        payloadReference: { retryCount: 9 },
      }),
    });
    expect(replay.statusCode).toBe(201);
    expect(replay.json().operation.id).toBe(tenantARoboflow.json().operation.id);
    expect(replay.json().operation.operationType).toBe('VISION_INSPECT');
    expect(replay.json().operation.state).toBe('NOT_CONFIGURED');
    expect(replay.json().executed).toBe(false);
  });

  it('rejects unauthenticated integration reads and writes', async () => {
    const payload = operationPayload({ idempotencyKey: 'unauthenticated' });
    const post = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      payload,
    });
    expect(post.statusCode).toBe(401);
    expect(post.json().error.code).toBe('DEVELOPMENT_IDENTITY_REQUIRED');

    const list = await app.inject({ method: 'GET', url: '/v1/integrations' });
    expect(list.statusCode).toBe(401);
    expect(list.json().error.code).toBe('DEVELOPMENT_IDENTITY_REQUIRED');

    const status = await app.inject({
      method: 'GET',
      url: '/v1/integrations/ROBOFLOW/status',
    });
    expect(status.statusCode).toBe(401);

    const unknownUser = await app.inject({
      method: 'GET',
      url: '/v1/integrations',
      headers: { 'x-earth-user-id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    });
    expect(unknownUser.statusCode).toBe(401);
    expect(unknownUser.json().error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('enforces RBAC from membership, not spoofed role headers', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'TINKER',
      enabled: true,
    });

    const viewerSpoof = await app.inject({
      method: 'POST',
      url: '/v1/integrations/TINKER/operations',
      headers: roleHeaders(DEV_VIEWER, 'OWNER'),
      payload: operationPayload({ idempotencyKey: 'viewer-spoof' }),
    });
    expect(viewerSpoof.statusCode).toBe(403);
    expect(viewerSpoof.json().operation.errorCode).toBe('INTEGRATION_ROLE_REQUIRED');

    const reviewerRead = await app.inject({
      method: 'GET',
      url: '/v1/integrations/TINKER/status',
      headers: roleHeaders(DEV_REVIEWER, 'OWNER'),
    });
    expect(reviewerRead.statusCode).toBe(200);
    expect(reviewerRead.json().status).toBe('NOT_CONFIGURED');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/TINKER/operations',
      headers: roleHeaders(DEV_OPERATIONS, 'OWNER'),
      payload: operationPayload({ idempotencyKey: 'ops-cancel-spoof' }),
    });
    expect(created.statusCode).toBe(201);

    const operationsCancel = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${created.json().operation.id}/cancel`,
      headers: roleHeaders(DEV_OPERATIONS, 'ESG_LEAD'),
    });
    expect(operationsCancel.statusCode).toBe(403);
    expect(operationsCancel.json().error.code).toBe('INTEGRATION_CANCELLATION_FORBIDDEN');

    const esgCancel = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${created.json().operation.id}/cancel`,
      headers: roleHeaders(DEV_ESG_LEAD),
    });
    expect(esgCancel.statusCode).toBe(200);
    expect(esgCancel.json().operation.state).toBe('CANCELLED');
  });

  it('rejects unknown adapters and unknown operation ids', async () => {
    const unknownStatus = await app.inject({
      method: 'GET',
      url: '/v1/integrations/ANTHROPIC/status',
      headers: roleHeaders(DEV_USER),
    });
    expect(unknownStatus.statusCode).toBe(404);
    expect(unknownStatus.json().error.code).toBe('INTEGRATION_PROVIDER_UNKNOWN');

    const unknownPost = await app.inject({
      method: 'POST',
      url: '/v1/integrations/OPENAI/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: 'unknown-adapter' }),
    });
    expect(unknownPost.statusCode).toBe(404);
    expect(unknownPost.json().error.code).toBe('INTEGRATION_PROVIDER_UNKNOWN');

    expect(() => service.adapter('OPENAI')).toThrow(/Unknown integration provider/);

    const missing = await app.inject({
      method: 'GET',
      url: '/v1/integration-operations/00000000-0000-4000-8000-000000000000',
      headers: roleHeaders(DEV_USER),
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('INTEGRATION_OPERATION_NOT_FOUND');
  });

  it('rejects forbidden side-effect operations', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'LANGGRAPH',
      enabled: true,
      allowedPurposes: ['VISION_INSPECT', 'SIGN', 'PAY', 'DECIDE_APPROVAL'],
    });

    for (const operationType of FORBIDDEN_PROVIDER_SIDE_EFFECTS) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/integrations/LANGGRAPH/operations',
        headers: roleHeaders(DEV_USER),
        payload: operationPayload({
          idempotencyKey: `forbidden-${operationType}`,
          operationType,
          purpose: 'VISION_INSPECT',
        }),
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().operation.state).toBe('BLOCKED');
      expect(response.json().operation.errorCode).toBe('INTEGRATION_FORBIDDEN_SIDE_EFFECT');
      expect(response.json().executed).toBe(false);
      expect(response.json().liveProviderCall).toBe(false);
    }

    const persisted = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n
       FROM integration_operations
       WHERE organization_id = $1 AND error_code = 'INTEGRATION_FORBIDDEN_SIDE_EFFECT'`,
      [DEV_ORG],
    );
    expect(Number(persisted.rows[0].n)).toBe(FORBIDDEN_PROVIDER_SIDE_EFFECTS.length);
  });

  it('enforces monthly request quota without inventing costs', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'HEYGEN',
      enabled: true,
      monthlyRequestLimit: 1,
    });

    const first = await app.inject({
      method: 'POST',
      url: '/v1/integrations/HEYGEN/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: 'quota-1' }),
    });
    expect(first.statusCode).toBe(201);
    expect(first.json().operation.state).toBe('NOT_CONFIGURED');

    const replay = await app.inject({
      method: 'POST',
      url: '/v1/integrations/HEYGEN/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: 'quota-1' }),
    });
    expect(replay.json().operation.id).toBe(first.json().operation.id);

    const second = await app.inject({
      method: 'POST',
      url: '/v1/integrations/HEYGEN/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: 'quota-2' }),
    });
    expect(second.statusCode).toBe(403);
    expect(second.json().operation.state).toBe('BLOCKED');
    expect(second.json().operation.errorCode).toBe('INTEGRATION_REQUEST_QUOTA_EXCEEDED');
    expect(second.json().executed).toBe(false);
  });

  it('records durable failures and keeps GET reads tenant-bound', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'INKLING',
      enabled: true,
      allowedDataClassifications: ['PUBLIC'],
    });

    const blocked = await app.inject({
      method: 'POST',
      url: '/v1/integrations/INKLING/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'durable-blocked',
        dataClassification: 'CONFIDENTIAL',
      }),
    });
    expect(blocked.statusCode).toBe(403);
    const blockedId = blocked.json().operation.id as string;

    const reread = await app.inject({
      method: 'GET',
      url: `/v1/integration-operations/${blockedId}`,
      headers: roleHeaders(DEV_USER),
    });
    expect(reread.statusCode).toBe(200);
    expect(reread.json().operation.state).toBe('BLOCKED');
    expect(reread.json().operation.errorCode).toBe('INTEGRATION_DATA_CLASSIFICATION_BLOCKED');
    expect(reread.json().operation.state).not.toBe('SUCCEEDED');
    expect(reread.json().operation.state).not.toBe('RUNNING');
    expect(reread.json().executed).toBe(false);

    const otherTenant = await app.inject({
      method: 'GET',
      url: `/v1/integration-operations/${blockedId}`,
      headers: otherHeaders,
    });
    expect(otherTenant.statusCode).toBe(404);
    expect(otherTenant.json().error.code).toBe('INTEGRATION_OPERATION_NOT_FOUND');

    const row = await pool.query<{ state: string; error_code: string | null }>(
      `SELECT state, error_code FROM integration_operations WHERE id = $1`,
      [blockedId],
    );
    expect(row.rows[0].state).toBe('BLOCKED');
    expect(row.rows[0].error_code).toBe('INTEGRATION_DATA_CLASSIFICATION_BLOCKED');
  });

  it('keeps NOT_CONFIGURED requests from executing even when retry metadata is present', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'ROBOFLOW',
      enabled: true,
    });

    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'retry-metadata',
        payloadReference: { retryCount: 5, timeoutMs: 10 },
      }),
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().operation.state).toBe('NOT_CONFIGURED');
    expect(created.json().operation.errorCode).toBe('INTEGRATION_NOT_CONFIGURED');
    expect(created.json().executed).toBe(false);
    expect(created.json().liveProviderCall).toBe(false);
    expect(created.json().operation.providerJobReference).toBeNull();
    expect(created.json().operation.startedAt).toBeNull();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(service.executeOperation()).rejects.toBeInstanceOf(IntegrationNotImplementedError);
    }

    const running = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM integration_operations WHERE state IN ('RUNNING', 'SUCCEEDED')`,
    );
    expect(running.rows[0].n).toBe('0');
  });

  it('does not overwrite durable BLOCKED failures when execute is attempted', async () => {
    const blocked = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: 'execute-blocked' }),
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().operation.state).toBe('BLOCKED');
    expect(blocked.json().operation.errorCode).toBe('INTEGRATION_POLICY_MISSING');
    const operationId = blocked.json().operation.id as string;

    const executed = await service.executeOperation(
      {
        organizationId: DEV_ORG,
        actorId: DEV_USER,
        role: 'OWNER',
        authMode: AUTH_MODE_DEVELOPMENT,
        correlationId: 'execute-blocked-test',
      },
      operationId,
    );
    expect(executed.state).toBe('BLOCKED');
    expect(executed.errorCode).toBe('INTEGRATION_POLICY_MISSING');

    const stored = await pool.query<{ state: string; error_code: string | null }>(
      `SELECT state, error_code FROM integration_operations WHERE id = $1`,
      [operationId],
    );
    expect(stored.rows[0]?.state).toBe('BLOCKED');
    expect(stored.rows[0]?.error_code).toBe('INTEGRATION_POLICY_MISSING');

    const failedAudit = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM audit_events
       WHERE organization_id = $1 AND event_type = 'INTEGRATION_FAILED'`,
      [DEV_ORG],
    );
    expect(Number(failedAudit.rows[0].n)).toBeGreaterThan(0);
  });

  it('blocks autonomous booking payload fields and top-level API keys', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'ROBOFLOW',
      enabled: true,
    });

    const booking = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'book-payload',
        payloadReference: { book: true },
      }),
    });
    expect(booking.statusCode).toBe(403);
    expect(booking.json().operation.state).toBe('BLOCKED');
    expect(booking.json().operation.errorCode).toBe('INTEGRATION_AUTONOMOUS_ACTION_FORBIDDEN');
    expect(booking.json().executed).toBe(false);

    const withKey = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: {
        ...operationPayload({ idempotencyKey: 'browser-key' }),
        apiKey: 'rf_from_browser',
      },
    });
    expect(withKey.statusCode).toBe(400);
    expect(withKey.json().error.code).toBe('INTEGRATION_UNSAFE_PAYLOAD_FIELD');
    expect(JSON.stringify(withKey.json())).not.toMatch(/rf_from_browser/);
  });

  it('persists intent timeout and expires overdue NOT_CONFIGURED operations without executing', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'HUGGINGFACE',
      enabled: true,
    });

    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/HUGGINGFACE/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'timeout-window',
        timeoutMs: 1,
      }),
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().operation.state).toBe('NOT_CONFIGURED');
    expect(created.json().operation.expiresAt).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 25));

    const expired = await app.inject({
      method: 'GET',
      url: `/v1/integration-operations/${created.json().operation.id}`,
      headers: roleHeaders(DEV_USER),
    });
    expect(expired.statusCode).toBe(200);
    expect(expired.json().operation.state).toBe('EXPIRED');
    expect(expired.json().operation.errorCode).toBe('INTEGRATION_OPERATION_EXPIRED');
    expect(expired.json().executed).toBe(false);
    expect(expired.json().liveProviderCall).toBe(false);
    expect(expired.json().operation.state).not.toBe('RUNNING');
    expect(expired.json().operation.state).not.toBe('SUCCEEDED');

    const replay = await app.inject({
      method: 'POST',
      url: '/v1/integrations/HUGGINGFACE/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'timeout-window',
        payloadReference: { retryCount: 3 },
      }),
    });
    expect(replay.statusCode).toBe(201);
    expect(replay.json().operation.id).toBe(created.json().operation.id);
    expect(replay.json().operation.state).toBe('EXPIRED');
    expect(replay.json().executed).toBe(false);

    const cancelExpired = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${created.json().operation.id}/cancel`,
      headers: roleHeaders(DEV_USER),
    });
    expect(cancelExpired.statusCode).toBe(200);
    expect(cancelExpired.json().operation.state).toBe('EXPIRED');
  });

  it('does not expire durable BLOCKED policy failures after timeout', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'TINKER',
      enabled: true,
    });

    const blocked = await app.inject({
      method: 'POST',
      url: '/v1/integrations/TINKER/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'blocked-timeout',
        dataClassification: 'RESTRICTED',
        timeoutMs: 1,
      }),
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().operation.state).toBe('BLOCKED');

    await new Promise((resolve) => setTimeout(resolve, 25));

    const stillBlocked = await app.inject({
      method: 'GET',
      url: `/v1/integration-operations/${blocked.json().operation.id}`,
      headers: roleHeaders(DEV_USER),
    });
    expect(stillBlocked.json().operation.state).toBe('BLOCKED');
    expect(stillBlocked.json().operation.errorCode).toBe('INTEGRATION_RESTRICTED_DATA_BLOCKED');
  });

  it('writes complete audit rows without secrets or payloads', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'ROBOFLOW',
      enabled: true,
    });

    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'audit-complete',
        payloadReference: {
          apiKey: 'should-never-appear',
          rawPrompt: 'secret prompt',
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaa.bbbb',
        },
      }),
    });
    expect(created.statusCode).toBe(201);
    const operationId = created.json().operation.id as string;
    const correlationId = created.json().operation.correlationId as string;

    const events = await pool.query<{
      organization_id: string;
      actor_id: string;
      auth_mode: string;
      correlation_id: string;
      policy_version: string;
      event_type: string;
      metadata_json: Record<string, unknown>;
    }>(
      `SELECT organization_id, actor_id, auth_mode, correlation_id, policy_version, event_type, metadata_json
       FROM audit_events
       WHERE organization_id = $1
         AND event_type LIKE 'INTEGRATION_%'
       ORDER BY created_at ASC`,
      [DEV_ORG],
    );

    const types = events.rows.map((row) => row.event_type);
    expect(types).toContain('INTEGRATION_REQUESTED');
    expect(types).toContain('INTEGRATION_NOT_CONFIGURED');

    for (const row of events.rows) {
      expect(row.organization_id).toBe(DEV_ORG);
      expect(row.actor_id).toBe(DEV_USER);
      expect(row.auth_mode).toBe(AUTH_MODE_DEVELOPMENT);
      expect(row.correlation_id).toBeTruthy();
      expect(row.policy_version).toBe(INTEGRATION_CONTROL_PLANE_VERSION);
    }

    const notConfigured = events.rows.find((row) => row.event_type === 'INTEGRATION_NOT_CONFIGURED');
    expect(notConfigured?.correlation_id).toBe(correlationId);
    expect(notConfigured?.metadata_json.operationId).toBe(operationId);
    expect(jsonHasSecretLike(events.rows)).toBe(false);
    expect(JSON.stringify(events.rows)).not.toMatch(/should-never-appear/);
    expect(JSON.stringify(events.rows)).not.toMatch(/secret prompt/);
  });

  it('ignores browser VITE_ credentials and never treats them as configured', async () => {
    const env = {
      VITE_ROBOFLOW_API_KEY: 'browser-leaked-key',
      VITE_HEYGEN_API_KEY: 'browser-heygen',
      VITE_TINKER_API_KEY: 'browser-tinker',
    };
    expect(probeProviderConfig('ROBOFLOW', env).envVarPresent).toBe(false);
    expect(probeProviderConfig('HEYGEN', env).envVarPresent).toBe(false);
    expect(probeProviderConfig('TINKER', env).envVarPresent).toBe(false);
    expect(probeProviderConfig('ROBOFLOW', env).statusIfKeyPresentStill).toBe('NOT_CONFIGURED');

    const previous = process.env.VITE_ROBOFLOW_API_KEY;
    process.env.VITE_ROBOFLOW_API_KEY = 'present-in-browser-only';
    try {
      const status = await app.inject({
        method: 'GET',
        url: '/v1/integrations/ROBOFLOW/status',
        headers: roleHeaders(DEV_USER),
      });
      expect(status.statusCode).toBe(200);
      expect(status.json().status).toBe('NOT_CONFIGURED');
      expect(status.json().connected).toBe(false);
      expect(status.json().live).toBe(false);
      expect(jsonHasSecretLike(status.json())).toBe(false);
      expect(JSON.stringify(status.json())).not.toMatch(/present-in-browser-only/);
      expect(JSON.stringify(status.json())).not.toMatch(/VITE_ROBOFLOW_API_KEY/);
    } finally {
      if (previous === undefined) {
        delete process.env.VITE_ROBOFLOW_API_KEY;
      } else {
        process.env.VITE_ROBOFLOW_API_KEY = previous;
      }
    }
  });

  it('does not call HTTP clients, browser kernels, or direct provider SDKs', () => {
    const files = listTsFiles(INTEGRATIONS_SRC);
    expect(files.length).toBeGreaterThan(5);

    const outbound = /\b(axios|got|undici|node-fetch|openai|@huggingface|langgraph|heygen)\b/;
    const fetchCall = /\bfetch\s*\(/;
    const nodeHttp = /from ['"]node:(http|https|net)['"]/;
    const browserKernel = /sovereign\/vision\/roboflow/;

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(outbound);
      expect(text, file).not.toMatch(fetchCall);
      expect(text, file).not.toMatch(nodeHttp);
      expect(text, file).not.toMatch(browserKernel);
      if (!file.endsWith(`${join('integrations', 'config.ts')}`)) {
        expect(text, file).not.toMatch(/VITE_[A-Z0-9_]+_API_KEY/);
      }
    }
  });
});

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}
