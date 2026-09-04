import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { DEVELOPMENT_MODE } from '../src/http.js';
import { INTEGRATION_FLAGS, PRODUCT_ROUTES, SERVICE_NAME, SERVICE_VERSION } from '../src/info.js';

describe('API foundation (DEVELOPMENT_ONLY)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns process liveness from GET /health without a database', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['x-earth-mode']).toBe(DEVELOPMENT_MODE);
    expect(response.json()).toEqual({
      mode: DEVELOPMENT_MODE,
      status: 'ok',
      service: SERVICE_NAME,
      check: 'process_liveness',
    });
  });

  it('returns DEVELOPMENT_ONLY info with honest intake flags and no secrets', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/info' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['x-earth-mode']).toBe(DEVELOPMENT_MODE);

    const body = response.json() as {
      mode: string;
      service: string;
      version: string;
      productionReady: boolean;
      integrations: Record<string, boolean>;
      routes: Array<{ method: string; path: string }>;
      note: string;
    };

    expect(body.mode).toBe(DEVELOPMENT_MODE);
    expect(body.service).toBe(SERVICE_NAME);
    expect(body.version).toBe(SERVICE_VERSION);
    expect(body.productionReady).toBe(false);
    expect(body.integrations).toEqual(INTEGRATION_FLAGS);
    expect(body.integrations.postgres).toBe(true);
    expect(body.integrations.materialOpportunityIntake).toBe(true);
    expect(body.integrations.primeRuntime).toBe(true);
    expect(body.integrations.authentication).toBe(false);
    expect(body.integrations.oidcConfigured).toBe(false);
    expect(body.integrations.nanoChat).toBe(false);
    expect(body.integrations.recyclerNetwork).toBe(false);
    expect(body.integrations.reinforcementLearning).toBe(false);
    expect(body.integrations.externalApis).toBe(false);
    expect(body.routes.map((route) => `${route.method} ${route.path}`)).toEqual(
      PRODUCT_ROUTES.map((route) => `${route.method} ${route.path}`),
    );
    expect(body.note).toMatch(/No live LLM, recycler, ERP, SKAT, or SAP/i);
    expect(JSON.stringify(body)).not.toMatch(/postgres:\/\//i);
    expect(JSON.stringify(body)).not.toMatch(/api[_-]?key/i);
    expect(JSON.stringify(body)).not.toMatch(/client_secret/i);
  });

  it('labels unknown routes as DEVELOPMENT_ONLY 404', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/no-such-route',
    });
    expect(response.statusCode).toBe(404);
    expect(response.headers['x-earth-mode']).toBe(DEVELOPMENT_MODE);
    expect(response.json()).toEqual({
      mode: DEVELOPMENT_MODE,
      error: {
        code: 'NOT_FOUND',
        message: 'no route for POST /v1/no-such-route',
      },
    });
  });

  it('allows the Vite origin and never uses a CORS wildcard with credentials', async () => {
    const allowed = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:5180' },
    });
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5180');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(allowed.headers['access-control-allow-origin']).not.toBe('*');

    const denied = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    expect(denied.headers['access-control-allow-credentials']).toBeUndefined();
  });
});

describe('loadConfig', () => {
  const developmentDefaults = {
    host: '0.0.0.0' as const,
    nodeEnv: 'development',
    authModeSetting: 'development' as const,
    oidc: null,
    corsOrigins: ['http://localhost:5180'],
    rateLimitMax: 100,
    rateLimitWindowMs: 60_000,
  };

  it('defaults to 0.0.0.0:3001 without a database URL', () => {
    expect(loadConfig({})).toEqual({
      ...developmentDefaults,
      port: 3001,
      databaseUrl: undefined,
    });
  });

  it('reads PORT from the environment', () => {
    expect(loadConfig({ PORT: '8080' })).toEqual({
      ...developmentDefaults,
      port: 8080,
      databaseUrl: undefined,
    });
  });

  it('reads DATABASE_URL when present', () => {
    expect(loadConfig({ DATABASE_URL: 'postgres://earth:earth@localhost:5432/earth' })).toEqual({
      ...developmentDefaults,
      port: 3001,
      databaseUrl: 'postgres://earth:earth@localhost:5432/earth',
    });
  });

  it('rejects a non-integer PORT', () => {
    expect(() => loadConfig({ PORT: 'nope' })).toThrow(/PORT must be a positive integer/);
  });

  it('refuses a CORS wildcard', () => {
    expect(() => loadConfig({ CORS_ORIGINS: '*' })).toThrow(/wildcard/);
  });
});
