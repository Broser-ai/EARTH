import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AUTH_MODE_DEVELOPMENT } from '../../../src/auth/types.js';
import { loadIntegrationConfig } from '../../../src/integrations/config.js';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import { IntegrationService } from '../../../src/integrations/core/service.js';
import { createIntegrationRegistry } from '../../../src/integrations/registry.js';
import {
  createPool,
  createTestApp,
  DEV_ORG,
  DEV_USER,
  DEV_VIEWER,
  devHeaders,
  otherHeaders,
  viewerHeaders,
} from '../../helpers.js';

const PROVIDERS = ['ROBOFLOW', 'HUGGINGFACE', 'TINKER', 'INKLING', 'HEYGEN', 'LANGGRAPH'] as const;

function assertNoLeak(value: unknown, secret?: string): void {
  const text = JSON.stringify(value);
  expect(text).not.toMatch(/api[_-]?key/i);
  expect(text).not.toMatch(/Bearer /);
  expect(text).not.toContain('"connected":true');
  if (secret) {
    expect(text).not.toContain(secret);
  }
}

describe('integration control plane HTTP', () => {
  let pool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
    pool = await createPool();
    app = await createTestApp(pool);
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    providerOutboundProbe.reset();
    await pool.query('TRUNCATE integration_operations, tenant_integration_policies');
    await pool.query(`DELETE FROM audit_events WHERE event_type LIKE 'INTEGRATION_%'`);
  });

  it('defaults every provider to NOT_CONFIGURED and never CONNECTED', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/integrations',
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      mode: string;
      connected: boolean;
      providers: Array<{ providerKey: string; status: string; connected: boolean; configured: boolean }>;
    };
    expect(body.mode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(body.connected).toBe(false);
    expect(body.providers.map((row) => row.providerKey).sort()).toEqual([...PROVIDERS].sort());
    for (const row of body.providers) {
      expect(row.status).toBe('NOT_CONFIGURED');
      expect(row.connected).toBe(false);
      expect(row.configured).toBe(false);
    }
    assertNoLeak(body);
  });

  it('returns NOT_CONFIGURED for a single provider status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/integrations/ROBOFLOW/status',
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { status: string; connected: boolean; reasonCode: string };
    expect(body.status).toBe('NOT_CONFIGURED');
    expect(body.connected).toBe(false);
    expect(body.reasonCode).toBe('PROVIDER_NOT_CONFIGURED');
    assertNoLeak(body);

    const audits = await pool.query<{ event_type: string }>(
      `SELECT event_type FROM audit_events WHERE event_type = 'INTEGRATION_HEALTH_CHECKED'`,
    );
    expect(audits.rowCount).toBeGreaterThan(0);
  });

  it('records NOT_CONFIGURED and does not execute when no tenant policy exists', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: { ...devHeaders, 'x-correlation-id': 'corr-no-policy' },
      payload: {
        operationType: 'MATERIAL_IMAGE_INFERENCE',
        purpose: 'MATERIAL_IMAGE_INFERENCE',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'no-policy-1',
        payload: { objectStorageRef: 'earth://internal/img-1' },
      },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json() as { operation: { state: string; errorCode: string }; connected: boolean };
    expect(body.operation.state).toBe('BLOCKED');
    expect(body.operation.errorCode).toBe('TENANT_POLICY_MISSING');
    expect(body.connected).toBe(false);
    expect(providerOutboundProbe.calls).toBe(0);
    assertNoLeak(body);

    const events = await pool.query<{ event_type: string }>(
      `SELECT event_type FROM audit_events WHERE event_type IN ('INTEGRATION_REQUESTED', 'INTEGRATION_BLOCKED')`,
    );
    const types = events.rows.map((row) => row.event_type);
    expect(types).toContain('INTEGRATION_REQUESTED');
    expect(types).toContain('INTEGRATION_BLOCKED');
  });

  it('blocks RESTRICTED data and writes an audit event', async () => {
    await insertPolicy(pool, DEV_ORG, true);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: devHeaders,
      payload: {
        operationType: 'MATERIAL_IMAGE_INFERENCE',
        purpose: 'MATERIAL_IMAGE_INFERENCE',
        dataClassification: 'RESTRICTED',
        idempotencyKey: 'restricted-1',
        payload: { objectStorageRef: 'earth://restricted/img-1' },
      },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json() as { operation: { state: string; errorCode: string } };
    expect(body.operation.state).toBe('BLOCKED');
    expect(body.operation.errorCode).toBe('RESTRICTED_DATA_BLOCKED');
    expect(providerOutboundProbe.calls).toBe(0);

    const blocked = await pool.query(
      `SELECT 1 FROM audit_events WHERE event_type = 'INTEGRATION_BLOCKED'`,
    );
    expect(blocked.rowCount).toBeGreaterThan(0);
  });

  it('blocks a disabled tenant policy', async () => {
    await insertPolicy(pool, DEV_ORG, false);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: devHeaders,
      payload: {
        operationType: 'MATERIAL_IMAGE_INFERENCE',
        purpose: 'MATERIAL_IMAGE_INFERENCE',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'disabled-policy-1',
        payload: { objectStorageRef: 'earth://internal/img-1' },
      },
    });
    expect(response.json().operation.errorCode).toBe('TENANT_POLICY_DISABLED');
    expect(response.json().operation.state).toBe('BLOCKED');
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('returns the original operation for a duplicate idempotency key', async () => {
    const payload = {
      operationType: 'MATERIAL_IMAGE_INFERENCE',
      purpose: 'MATERIAL_IMAGE_INFERENCE',
      dataClassification: 'INTERNAL',
      idempotencyKey: 'idem-1',
      payload: { objectStorageRef: 'earth://internal/img-1' },
    };
    const first = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: devHeaders,
      payload,
    });
    const second = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: devHeaders,
      payload,
    });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json().replayed).toBe(true);
    expect(second.json().operation.id).toBe(first.json().operation.id);
  });

  it('hides tenant A operations from tenant B', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: devHeaders,
      payload: {
        operationType: 'MATERIAL_IMAGE_INFERENCE',
        purpose: 'MATERIAL_IMAGE_INFERENCE',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'tenant-a-1',
        payload: { objectStorageRef: 'earth://internal/img-1' },
      },
    });
    const operationId = created.json().operation.id as string;
    const other = await app.inject({
      method: 'GET',
      url: `/v1/integration-operations/${operationId}`,
      headers: otherHeaders,
    });
    expect(other.statusCode).toBe(404);
    expect(other.json().error.code).toBe('OPERATION_NOT_FOUND');
    assertNoLeak(other.json());
  });

  it('forbids VIEWER from creating or cancelling operations', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: viewerHeaders,
      payload: {
        operationType: 'MATERIAL_IMAGE_INFERENCE',
        purpose: 'MATERIAL_IMAGE_INFERENCE',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'viewer-create',
        payload: { objectStorageRef: 'earth://internal/img-1' },
      },
    });
    expect(created.statusCode).toBe(403);
    expect(created.json().error.code).toBe('ROLE_FORBIDDEN');

    const owner = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: devHeaders,
      payload: {
        operationType: 'MATERIAL_IMAGE_INFERENCE',
        purpose: 'MATERIAL_IMAGE_INFERENCE',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'viewer-cancel-target',
        payload: { objectStorageRef: 'earth://internal/img-1' },
      },
    });
    const cancel = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${owner.json().operation.id}/cancel`,
      headers: viewerHeaders,
    });
    expect(cancel.statusCode).toBe(403);
    expect(cancel.json().error.code).toBe('ROLE_FORBIDDEN');
  });

  it('cancels an operation without calling a provider', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: devHeaders,
      payload: {
        operationType: 'MATERIAL_IMAGE_INFERENCE',
        purpose: 'MATERIAL_IMAGE_INFERENCE',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'cancel-1',
        payload: { objectStorageRef: 'earth://internal/img-1' },
      },
    });
    const cancel = await app.inject({
      method: 'POST',
      url: `/v1/integration-operations/${created.json().operation.id}/cancel`,
      headers: devHeaders,
    });
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json().operation.state).toBe('CANCELLED');
    expect(providerOutboundProbe.calls).toBe(0);
    const events = await pool.query(
      `SELECT 1 FROM audit_events WHERE event_type = 'INTEGRATION_CANCELLED'`,
    );
    expect(events.rowCount).toBeGreaterThan(0);
  });

  it('does not execute a provider while NOT_CONFIGURED', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: devHeaders,
      payload: {
        operationType: 'MATERIAL_IMAGE_INFERENCE',
        purpose: 'MATERIAL_IMAGE_INFERENCE',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'exec-1',
        payload: { objectStorageRef: 'earth://internal/img-1' },
      },
    });
    expect(providerOutboundProbe.calls).toBe(0);
    const service = new IntegrationService(pool, createIntegrationRegistry(), loadIntegrationConfig());
    const executed = await service.executeOperation(
      {
        organizationId: DEV_ORG,
        actorId: DEV_USER,
        role: 'OWNER',
        authMode: AUTH_MODE_DEVELOPMENT,
        correlationId: 'exec-test',
      },
      created.json().operation.id as string,
    );
    expect(executed.state).toBe('NOT_CONFIGURED');
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('rejects browser-supplied provider keys and unknown providers', async () => {
    const withKey = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: devHeaders,
      payload: {
        operationType: 'MATERIAL_IMAGE_INFERENCE',
        purpose: 'MATERIAL_IMAGE_INFERENCE',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'browser-key',
        apiKey: 'rf_from_browser',
      },
    });
    expect(withKey.statusCode).toBe(400);
    expect(withKey.json().error.code).toBe('UNSAFE_PAYLOAD_FIELD');
    assertNoLeak(withKey.json(), 'rf_from_browser');

    const unknown = await app.inject({
      method: 'GET',
      url: '/v1/integrations/OPENAI/status',
      headers: devHeaders,
    });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json().error.code).toBe('PROVIDER_NOT_ALLOWLISTED');
  });

  it('lets VIEWER read the catalog', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/integrations',
      headers: viewerHeaders,
    });
    expect(response.statusCode).toBe(200);
    void DEV_VIEWER;
  });
});

async function insertPolicy(pool: Pool, organizationId: string, enabled: boolean): Promise<void> {
  await pool.query(
    `INSERT INTO tenant_integration_policies (
       id, organization_id, provider_key, enabled,
       allowed_data_classifications, allowed_purposes, require_human_approval
     ) VALUES (
       gen_random_uuid(), $1, 'ROBOFLOW', $2,
       ARRAY['INTERNAL']::text[], ARRAY['MATERIAL_IMAGE_INFERENCE']::text[], true
     )`,
    [organizationId, enabled],
  );
}

