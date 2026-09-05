import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import { createPool, createTestApp, devHeaders } from '../../helpers.js';
import {
  assertNoConnected,
  assertNoSecretLeak,
  ENV_KEY_SECRETS,
  PROVIDER_CONTRACTS,
  statusUrl,
  truncateIntegrationLedger,
} from '../../helpers/integration-security.js';

const MANAGED_ENV = [
  ...PROVIDER_CONTRACTS.flatMap((row) => [row.enableEnv, row.credentialEnv]),
  'ROBOFLOW_API_KEY',
  'HF_TOKEN',
  'HUGGINGFACE_TOKEN',
  'TINKER_API_KEY',
  'INKLING_WEIGHTS_URI',
  'HEYGEN_API_KEY',
].filter((name): name is string => Boolean(name));

describe('environment credentials are not CONNECTED', () => {
  let pool: Pool;
  let app: FastifyInstance;
  const snapshot: Record<string, string | undefined> = {};

  beforeAll(async () => {
    for (const name of MANAGED_ENV) {
      snapshot[name] = process.env[name];
    }
    for (const fixture of PROVIDER_CONTRACTS) {
      process.env[fixture.enableEnv] = 'false';
      if (fixture.providerKey === 'LANGGRAPH' || !fixture.credentialEnv) {
        continue;
      }
      process.env[fixture.credentialEnv] = ENV_KEY_SECRETS[fixture.providerKey];
    }
    pool = await createPool();
    app = await createTestApp(pool);
  });

  afterAll(async () => {
    for (const name of MANAGED_ENV) {
      if (snapshot[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = snapshot[name];
      }
    }
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    providerOutboundProbe.reset();
    await truncateIntegrationLedger(pool);
  });

  it.each(PROVIDER_CONTRACTS)(
    '$providerKey stays disconnected when only an environment credential is set',
    async (fixture) => {
      const response = await app.inject({
        method: 'GET',
        url: statusUrl(fixture.providerKey),
        headers: devHeaders,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        status: string;
        connected: boolean;
        configured: boolean;
        enabled: boolean;
      };
      expect(body.connected).toBe(false);
      expect(body.enabled).toBe(false);
      expect(body.status).not.toBe('CONNECTED');
      expect(body.status).toBe('NOT_CONFIGURED');
      if (fixture.providerKey !== 'LANGGRAPH') {
        expect(body.configured).toBe(true);
      }
      const secrets = fixture.providerKey === 'LANGGRAPH' ? [] : [ENV_KEY_SECRETS[fixture.providerKey]];
      assertNoConnected(body);
      assertNoSecretLeak(body, secrets);
      expect(providerOutboundProbe.calls).toBe(0);
    },
  );

  it('catalog never reports CONNECTED or leaks env credentials', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/integrations',
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { connected: boolean };
    expect(body.connected).toBe(false);
    assertNoConnected(body);
    assertNoSecretLeak(body, Object.values(ENV_KEY_SECRETS));
    expect(providerOutboundProbe.calls).toBe(0);
  });
});
