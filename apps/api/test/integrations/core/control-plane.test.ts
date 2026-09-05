import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AUTH_MODE_DEVELOPMENT } from '../../../src/auth/types.js';
import { NotConfiguredProviderAdapter } from '../../../src/integrations/core/adapter.js';
import { IntegrationNotImplementedError } from '../../../src/integrations/core/errors.js';
import { IntegrationControlService } from '../../../src/integrations/core/service.js';
import { probeProviderConfig } from '../../../src/integrations/config.js';
import {
  createPool,
  createTestApp,
  DEV_ESG_LEAD,
  DEV_OPERATIONS,
  DEV_ORG,
  DEV_REVIEWER,
  DEV_USER,
  DEV_VIEWER,
  OTHER_ORG,
  jsonHasSecretLike,
  operationPayload,
  otherHeaders,
  PROVIDERS,
  resetIntegrationTables,
  roleHeaders,
  upsertTenantPolicy,
} from './helpers.js';
import { demoBody, devHeaders } from '../../helpers.js';

describe('Integration Control Plane v0.1', () => {
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

  it('seeds all six providers as NOT_CONFIGURED', async () => {
    const seeded = await pool.query<{ provider_key: string; default_status: string }>(
      `SELECT provider_key, default_status FROM integration_providers ORDER BY provider_key`,
    );
    expect(seeded.rows.map((row) => row.provider_key).sort()).toEqual([...PROVIDERS].sort());
    expect(seeded.rows.every((row) => row.default_status === 'NOT_CONFIGURED')).toBe(true);

    const listed = await app.inject({ method: 'GET', url: '/v1/integrations', headers: roleHeaders(DEV_USER) });
    expect(listed.statusCode).toBe(200);
    const body = listed.json() as {
      mode: string;
      providers: Array<{ providerKey: string; status: string; connected: boolean; live: boolean }>;
      healthCheck: string;
    };
    expect(body.mode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(body.healthCheck).toBe('SKIPPED');
    expect(body.providers).toHaveLength(6);
    for (const provider of body.providers) {
      expect(provider.status).toBe('NOT_CONFIGURED');
      expect(provider.connected).toBe(false);
      expect(provider.live).toBe(false);
    }

    for (const providerKey of PROVIDERS) {
      const status = await app.inject({
        method: 'GET',
        url: `/v1/integrations/${providerKey}/status`,
        headers: roleHeaders(DEV_USER),
      });
      expect(status.statusCode).toBe(200);
      expect(status.json().status).toBe('NOT_CONFIGURED');
      expect(status.json().connected).toBe(false);
      expect(status.json().mode).toBe(AUTH_MODE_DEVELOPMENT);
    }
  });

  it('does not treat config presence as AVAILABLE or CONNECTED', async () => {
    const previous = process.env.ROBOFLOW_API_KEY;
    process.env.ROBOFLOW_API_KEY = 'present-but-not-a-connection';
    try {
      expect(probeProviderConfig('ROBOFLOW').envVarPresent).toBe(true);
      expect(probeProviderConfig('ROBOFLOW').statusIfKeyPresentStill).toBe('NOT_CONFIGURED');

      const status = await app.inject({
        method: 'GET',
        url: '/v1/integrations/ROBOFLOW/status',
        headers: roleHeaders(DEV_USER),
      });
      expect(status.statusCode).toBe(200);
      expect(status.json().status).toBe('NOT_CONFIGURED');
      expect(status.json().status).not.toBe('AVAILABLE');
      expect(status.json().connected).toBe(false);
      expect(status.json().live).toBe(false);
      expect(status.json().trained).toBe(false);
      expect(status.json().productionReady).toBe(false);
      expect(jsonHasSecretLike(status.json())).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.ROBOFLOW_API_KEY;
      } else {
        process.env.ROBOFLOW_API_KEY = previous;
      }
    }
  });

  it('blocks a tenant without a policy', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER, 'OWNER'),
      payload: operationPayload({ idempotencyKey: 'no-policy' }),
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().mode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(response.json().operation.state).toBe('BLOCKED');
    expect(response.json().operation.errorCode).toBe('INTEGRATION_POLICY_MISSING');
    expect(response.json().executed).toBe(false);
  });

  it('blocks a disabled tenant policy', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'ROBOFLOW',
      enabled: false,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: 'disabled-policy' }),
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().operation.state).toBe('BLOCKED');
    expect(response.json().operation.errorCode).toBe('INTEGRATION_POLICY_DISABLED');
  });

  it('blocks RESTRICTED data even when the tenant policy allows it', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'ROBOFLOW',
      enabled: true,
      allowedDataClassifications: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
    });
    const response = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'restricted',
        dataClassification: 'RESTRICTED',
      }),
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().operation.state).toBe('BLOCKED');
    expect(response.json().operation.errorCode).toBe('INTEGRATION_RESTRICTED_DATA_BLOCKED');
  });

  it('blocks disallowed classification and purpose', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'HUGGINGFACE',
      enabled: true,
      allowedDataClassifications: ['PUBLIC'],
      allowedPurposes: ['MODEL_CARD_LOOKUP'],
    });

    const classification = await app.inject({
      method: 'POST',
      url: '/v1/integrations/HUGGINGFACE/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'class-blocked',
        purpose: 'MODEL_CARD_LOOKUP',
        dataClassification: 'CONFIDENTIAL',
      }),
    });
    expect(classification.statusCode).toBe(403);
    expect(classification.json().operation.errorCode).toBe('INTEGRATION_DATA_CLASSIFICATION_BLOCKED');

    const purpose = await app.inject({
      method: 'POST',
      url: '/v1/integrations/HUGGINGFACE/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'purpose-blocked',
        purpose: 'FINE_TUNE',
        dataClassification: 'PUBLIC',
      }),
    });
    expect(purpose.statusCode).toBe(403);
    expect(purpose.json().operation.errorCode).toBe('INTEGRATION_PURPOSE_BLOCKED');
  });

  it('forbids REVIEWER and VIEWER from requesting operations', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'TINKER',
      enabled: true,
    });

    for (const userId of [DEV_REVIEWER, DEV_VIEWER]) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/integrations/TINKER/operations',
        headers: roleHeaders(userId, 'OWNER'),
        payload: operationPayload({ idempotencyKey: `role-${userId}` }),
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().operation.errorCode).toBe('INTEGRATION_ROLE_REQUIRED');
      expect(response.json().operation.state).toBe('BLOCKED');
    }
  });

  it('lets OWNER ESG_LEAD and OPERATIONS create permitted records without executing a provider', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'HEYGEN',
      enabled: true,
    });

    const actors = [
      { userId: DEV_USER, label: 'OWNER' },
      { userId: DEV_ESG_LEAD, label: 'ESG_LEAD' },
      { userId: DEV_OPERATIONS, label: 'OPERATIONS' },
    ];

    for (const actor of actors) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/integrations/HEYGEN/operations',
        headers: roleHeaders(actor.userId),
        payload: operationPayload({ idempotencyKey: `permitted-${actor.label}` }),
      });
      expect(response.statusCode).toBe(201);
      expect(response.json().mode).toBe(AUTH_MODE_DEVELOPMENT);
      expect(response.json().executed).toBe(false);
      expect(response.json().liveProviderCall).toBe(false);
      expect(response.json().operation.state).toBe('NOT_CONFIGURED');
      expect(response.json().operation.errorCode).toBe('INTEGRATION_NOT_CONFIGURED');
      expect(response.json().operation.providerJobReference).toBeNull();
      expect(response.json().operation.state).not.toBe('SUCCEEDED');
      expect(response.json().operation.state).not.toBe('RUNNING');
    }
  });

  it('returns the original operation for the same tenant provider idempotency key', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'LANGGRAPH',
      enabled: true,
    });
    const payload = operationPayload({ idempotencyKey: 'same-key-once' });
    const first = await app.inject({
      method: 'POST',
      url: '/v1/integrations/LANGGRAPH/operations',
      headers: roleHeaders(DEV_USER),
      payload,
    });
    const second = await app.inject({
      method: 'POST',
      url: '/v1/integrations/LANGGRAPH/operations',
      headers: roleHeaders(DEV_USER),
      payload: { ...payload, operationType: 'DIFFERENT_TYPE' },
    });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json().operation.id).toBe(first.json().operation.id);
    expect(second.json().operation.operationType).toBe('VISION_INSPECT');
  });

  it('hides tenant A operations from tenant B reads and cancels', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'ROBOFLOW',
      enabled: true,
    });
    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: 'tenant-a-op' }),
    });
    expect(created.statusCode).toBe(201);
    const operationId = created.json().operation.id as string;

    const read = await app.inject({
      method: 'GET',
      url: `/v1/integration-operations/${operationId}`,
      headers: otherHeaders,
    });
    expect(read.statusCode).toBe(404);
    expect(read.json().error.code).toBe('INTEGRATION_OPERATION_NOT_FOUND');

    const cancel = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${operationId}/cancel`,
      headers: otherHeaders,
    });
    expect(cancel.statusCode).toBe(404);
    expect(cancel.json().error.code).toBe('INTEGRATION_OPERATION_NOT_FOUND');

    const stillThere = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM integration_operations WHERE id = $1 AND organization_id = $2`,
      [operationId, DEV_ORG],
    );
    expect(stillThere.rows[0].n).toBe('1');
    expect(OTHER_ORG).not.toBe(DEV_ORG);
  });

  it('lets only OWNER and ESG_LEAD cancel own-tenant operations', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'INKLING',
      enabled: true,
    });
    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/INKLING/operations',
      headers: roleHeaders(DEV_OPERATIONS),
      payload: operationPayload({ idempotencyKey: 'cancel-rbac' }),
    });
    expect(created.statusCode).toBe(201);
    const operationId = created.json().operation.id as string;

    const operationsCancel = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${operationId}/cancel`,
      headers: roleHeaders(DEV_OPERATIONS),
    });
    expect(operationsCancel.statusCode).toBe(403);
    expect(operationsCancel.json().error.code).toBe('INTEGRATION_CANCELLATION_FORBIDDEN');

    const reviewerCancel = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${operationId}/cancel`,
      headers: roleHeaders(DEV_REVIEWER),
    });
    expect(reviewerCancel.statusCode).toBe(403);
    expect(reviewerCancel.json().error.code).toBe('INTEGRATION_CANCELLATION_FORBIDDEN');

    const ownerCancel = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${operationId}/cancel`,
      headers: roleHeaders(DEV_USER),
    });
    expect(ownerCancel.statusCode).toBe(200);
    expect(ownerCancel.json().operation.state).toBe('CANCELLED');

    const second = await app.inject({
      method: 'POST',
      url: '/v1/integrations/INKLING/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: 'cancel-esg' }),
    });
    const esgCancel = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${second.json().operation.id}/cancel`,
      headers: roleHeaders(DEV_ESG_LEAD),
    });
    expect(esgCancel.statusCode).toBe(200);
    expect(esgCancel.json().operation.state).toBe('CANCELLED');
  });

  it('writes audit events for request block not-configured and cancel without secrets', async () => {
    await upsertTenantPolicy(pool, {
      organizationId: DEV_ORG,
      providerKey: 'ROBOFLOW',
      enabled: true,
    });

    const blocked = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({
        idempotencyKey: 'audit-restricted',
        dataClassification: 'RESTRICTED',
        payloadReference: { apiKey: 'should-never-appear', rawPrompt: 'secret prompt' },
      }),
    });
    expect(blocked.statusCode).toBe(403);

    const recorded = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ idempotencyKey: 'audit-ok' }),
    });
    expect(recorded.statusCode).toBe(201);
    const operationId = recorded.json().operation.id as string;

    const cancelled = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${operationId}/cancel`,
      headers: roleHeaders(DEV_USER),
    });
    expect(cancelled.statusCode).toBe(200);

    const events = await pool.query<{ event_type: string; metadata_json: Record<string, unknown> }>(
      `SELECT event_type, metadata_json FROM audit_events
       WHERE organization_id = $1
         AND event_type LIKE 'INTEGRATION_%'
       ORDER BY created_at ASC`,
      [DEV_ORG],
    );
    const types = events.rows.map((row) => row.event_type);
    expect(types).toContain('INTEGRATION_REQUESTED');
    expect(types).toContain('INTEGRATION_BLOCKED');
    expect(types).toContain('INTEGRATION_NOT_CONFIGURED');
    expect(types).toContain('INTEGRATION_CANCELLED');

    expect(jsonHasSecretLike(events.rows)).toBe(false);
    expect(JSON.stringify(events.rows)).not.toMatch(/should-never-appear/);
    expect(JSON.stringify(events.rows)).not.toMatch(/secret prompt/);
    expect(jsonHasSecretLike(blocked.json())).toBe(false);
    expect(jsonHasSecretLike(recorded.json())).toBe(false);
  });

  it('makes executeOperation impossible in v0.1', async () => {
    const adapter = new NotConfiguredProviderAdapter('ROBOFLOW', {
      validateRequest: async () => {
        throw new Error('unused');
      },
      createOperation: async () => {
        throw new Error('unused');
      },
      cancelOperation: async () => {
        throw new Error('unused');
      },
    });
    await expect(adapter.executeOperation()).rejects.toBeInstanceOf(IntegrationNotImplementedError);
    await expect(adapter.getStatus(dummyTenant())).resolves.toBe('NOT_CONFIGURED');
    await expect(service.executeOperation()).rejects.toBeInstanceOf(IntegrationNotImplementedError);

    const running = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM integration_operations WHERE state IN ('RUNNING', 'SUCCEEDED')`,
    );
    expect(running.rows[0].n).toBe('0');
  });

  it('keeps Material Opportunity Intake working on the same app', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'intake-still-green' },
    });
    expect(start.statusCode).toBe(201);
    expect(start.json().mode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(start.json().session.id).toBeTruthy();
  });

  it('rejects unknown providers and route/body provider mismatches', async () => {
    const unknown = await app.inject({
      method: 'GET',
      url: '/v1/integrations/OPENAI/status',
      headers: roleHeaders(DEV_USER),
    });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json().error.code).toBe('INTEGRATION_PROVIDER_UNKNOWN');

    const mismatch = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: roleHeaders(DEV_USER),
      payload: operationPayload({ providerKey: 'HEYGEN', idempotencyKey: 'mismatch' }),
    });
    expect(mismatch.statusCode).toBe(400);
    expect(mismatch.json().error.code).toBe('INTEGRATION_PROVIDER_MISMATCH');
  });
});

function dummyTenant() {
  return {
    organizationId: DEV_ORG,
    actorId: DEV_USER,
    role: 'OWNER' as const,
    authMode: AUTH_MODE_DEVELOPMENT,
    correlationId: 'test-correlation',
  };
}
