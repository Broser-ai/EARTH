import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { DEVELOPMENT_MODE } from '../src/http.js';
import { INTEGRATION_FLAGS, SERVICE_NAME, SERVICE_VERSION } from '../src/info.js';

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

  it('returns DEVELOPMENT_ONLY info with every integration flagged false', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/info' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['x-earth-mode']).toBe(DEVELOPMENT_MODE);

    const body = response.json() as {
      mode: string;
      service: string;
      version: string;
      integrations: Record<string, boolean>;
      routes: Array<{ method: string; path: string }>;
    };

    expect(body.mode).toBe(DEVELOPMENT_MODE);
    expect(body.service).toBe(SERVICE_NAME);
    expect(body.version).toBe(SERVICE_VERSION);
    expect(body.integrations).toEqual(INTEGRATION_FLAGS);
    expect(Object.values(body.integrations).every((flag) => flag === false)).toBe(true);
    expect(body.routes.map((route) => route.path).sort()).toEqual(['/health', '/v1/info']);
    expect(JSON.stringify(body)).not.toMatch(/postgres:\/\//i);
    expect(JSON.stringify(body)).not.toMatch(/api[_-]?key/i);
  });

  it('labels unknown routes as DEVELOPMENT_ONLY 404', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
    });
    expect(response.statusCode).toBe(404);
    expect(response.headers['x-earth-mode']).toBe(DEVELOPMENT_MODE);
    expect(response.json()).toEqual({
      mode: DEVELOPMENT_MODE,
      error: {
        code: 'NOT_FOUND',
        message: 'no route for POST /v1/material-opportunities/start',
      },
    });
  });
});

describe('loadConfig', () => {
  it('defaults to 0.0.0.0:3001', () => {
    expect(loadConfig({})).toEqual({ host: '0.0.0.0', port: 3001 });
  });

  it('reads PORT from the environment', () => {
    expect(loadConfig({ PORT: '8080' })).toEqual({ host: '0.0.0.0', port: 8080 });
  });

  it('rejects a non-integer PORT', () => {
    expect(() => loadConfig({ PORT: 'nope' })).toThrow(/PORT must be a positive integer/);
  });
});
