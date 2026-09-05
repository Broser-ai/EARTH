import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { assertNoViteIntegrationSecrets } from '../../../src/integrations/config.js';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import { createPool, createTestApp, DEV_ORG, devHeaders } from '../../helpers.js';

const SECRET = 'rf_test_secret_do_not_leak_xx';

describe('configured credential is not CONNECTED', () => {
  let pool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.EARTH_INTEGRATION_ROBOFLOW_API_KEY = SECRET;
    process.env.EARTH_INTEGRATION_ROBOFLOW_ENABLED = 'false';
    pool = await createPool();
    app = await createTestApp(pool);
  });

  afterAll(async () => {
    delete process.env.EARTH_INTEGRATION_ROBOFLOW_API_KEY;
    delete process.env.EARTH_INTEGRATION_ROBOFLOW_ENABLED;
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    providerOutboundProbe.reset();
    await pool.query('TRUNCATE integration_operations, tenant_integration_policies');
    await pool.query(`DELETE FROM audit_events WHERE event_type LIKE 'INTEGRATION_%'`);
  });

  it('reports configured=true without CONNECTED or leaking the credential', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/integrations/ROBOFLOW/status',
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      status: string;
      configured: boolean;
      enabled: boolean;
      connected: boolean;
    };
    expect(body.configured).toBe(true);
    expect(body.enabled).toBe(false);
    expect(body.status).toBe('NOT_CONFIGURED');
    expect(body.connected).toBe(false);
    const text = JSON.stringify(body);
    expect(text).not.toContain(SECRET);
    expect(text).not.toMatch(/api[_-]?key/i);

    const audits = await pool.query<{ metadata_json: unknown }>(
      `SELECT metadata_json FROM audit_events WHERE event_type = 'INTEGRATION_HEALTH_CHECKED'`,
    );
    expect(JSON.stringify(audits.rows)).not.toContain(SECRET);
  });

  it('blocks POST while a credential exists without an enable flag', async () => {
    await pool.query(
      `INSERT INTO tenant_integration_policies (
         id, organization_id, provider_key, enabled,
         allowed_data_classifications, allowed_purposes, require_human_approval
       ) VALUES (
         gen_random_uuid(), $1, 'ROBOFLOW', true,
         ARRAY['INTERNAL']::text[], ARRAY['MATERIAL_IMAGE_INFERENCE']::text[], true
       )`,
      [DEV_ORG],
    );
    const response = await app.inject({
      method: 'POST',
      url: '/v1/integrations/ROBOFLOW/operations',
      headers: devHeaders,
      payload: {
        operationType: 'MATERIAL_IMAGE_INFERENCE',
        purpose: 'MATERIAL_IMAGE_INFERENCE',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'configured-not-enabled',
        payload: { objectStorageRef: 'earth://internal/img-1' },
      },
    });
    expect(response.json().operation.errorCode).toBe('PROVIDER_DISABLED');
    expect(response.json().connected).toBe(false);
    expect(JSON.stringify(response.json())).not.toContain(SECRET);
    expect(providerOutboundProbe.calls).toBe(0);
  });
});

describe('VITE_* integration secrets', () => {
  it('refuses process start when a VITE_ provider key is set', () => {
    expect(() =>
      assertNoViteIntegrationSecrets({
        VITE_ROBOFLOW_API_KEY: 'must-never-bundle',
      } as NodeJS.ProcessEnv),
    ).toThrow(/VITE_\* integration secrets are forbidden/);
  });
});
