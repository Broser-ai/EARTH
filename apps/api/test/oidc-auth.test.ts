import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  UnsecuredJWT,
  type GenerateKeyPairResult,
  type JWK,
  type JWTVerifyGetKey,
  type KeyLike,
} from 'jose';
import type { Pool } from 'pg';
import { OidcJwtAuthProvider } from '../src/auth/oidc-provider.js';
import { AUTH_MODE_OIDC } from '../src/auth/types.js';
import { loadConfig } from '../src/config.js';
import { INTEGRATION_FLAGS } from '../src/info.js';
import {
  createPool,
  createTestApp,
  demoBody,
  DEV_ORG,
  DEV_USER,
  DEV_VIEWER,
  OTHER_ORG,
  OTHER_USER,
  resetWorkflowTables,
  upsertUser,
} from './helpers.js';

const ISSUER = 'https://idp.example.test/';
const AUDIENCE = 'earth-api';
const JWKS_URI = 'https://idp.example.test/oidc/jwks';
const OWNER_SUBJECT = 'oidc|earth-dev-owner';
const UNKNOWN_SUBJECT = 'oidc|not-provisioned';
const KEY_ID = 'earth-test-1';

describe('OidcJwtAuthProvider', () => {
  let pool: Pool;
  let app: FastifyInstance;
  let keyPair: GenerateKeyPairResult;
  let privateKey: KeyLike;
  let getKey: JWTVerifyGetKey;

  beforeAll(async () => {
    pool = await createPool();
    keyPair = await generateKeyPair('RS256', { extractable: true });
    privateKey = keyPair.privateKey;
    const jwk = (await exportJWK(keyPair.publicKey)) as JWK;
    jwk.kid = KEY_ID;
    jwk.alg = 'RS256';
    jwk.use = 'sig';
    getKey = createLocalJWKSet({ keys: [jwk] });

    await upsertUser(pool, {
      id: DEV_USER,
      organizationId: DEV_ORG,
      email: 'dev-owner@earth.local',
      role: 'OWNER',
      oidcSubject: OWNER_SUBJECT,
    });

    const config = loadConfig({
      NODE_ENV: 'test',
      EARTH_AUTH_MODE: 'oidc',
      OIDC_ISSUER_URL: ISSUER,
      OIDC_AUDIENCE: AUDIENCE,
      OIDC_JWKS_URI: JWKS_URI,
      DATABASE_URL: process.env.DATABASE_URL,
    });
    const provider = new OidcJwtAuthProvider(pool, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
      jwksUri: JWKS_URI,
      getKey,
    });
    app = await createTestApp(pool, { config, authProvider: provider, oidcConfigured: true });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await resetWorkflowTables(pool);
  });

  it('reports honest /v1/info flags in OIDC mode', async () => {
    const info = await app.inject({ method: 'GET', url: '/v1/info' });
    expect(info.statusCode).toBe(200);
    expect(info.headers['x-earth-mode']).toBeUndefined();
    const body = info.json();
    expect(body.mode).toBeUndefined();
    expect(body.productionReady).toBe(false);
    expect(body.integrations.authentication).toBe(false);
    expect(body.integrations.oidcConfigured).toBe(true);
    expect(body.integrations.nanoChat).toBe(false);
    expect(body.integrations.recyclerNetwork).toBe(false);
    expect(body.integrations.reinforcementLearning).toBe(false);
    expect(body.integrations.blockchain).toBe(false);
    expect(body.integrations.digitalProductPassport).toBe(false);
    expect(body.integrations.postgres).toBe(INTEGRATION_FLAGS.postgres);
  });

  it('maps a mocked JWKS-signed token to the provisioned user', async () => {
    const token = await signToken({ sub: OWNER_SUBJECT });
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: bearerHeaders(token),
      payload: { ...demoBody, idempotencyKey: 'oidc-provisioned' },
    });
    expect(start.statusCode).toBe(201);
    expect(start.json().mode).toBeUndefined();
    expect(start.json().session.id).toBeTruthy();

    const row = await pool.query<{ organization_id: string; created_by: string }>(
      `SELECT organization_id, created_by FROM execution_sessions WHERE idempotency_key = $1`,
      ['oidc-provisioned'],
    );
    expect(row.rows[0]?.organization_id).toBe(DEV_ORG);
    expect(row.rows[0]?.created_by).toBe(DEV_USER);
  });

  it('rejects an unprovisioned subject with AUTHORIZED_ACCOUNT_NOT_PROVISIONED', async () => {
    const token = await signToken({ sub: UNKNOWN_SUBJECT });
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: bearerHeaders(token),
      payload: { ...demoBody, idempotencyKey: 'oidc-unprovisioned' },
    });
    expect(start.statusCode).toBe(403);
    expect(start.json().error.code).toBe('AUTHORIZED_ACCOUNT_NOT_PROVISIONED');
    expect(JSON.stringify(start.json())).not.toMatch(/oidc\|/);
  });

  it('does not grant org or role from token claims', async () => {
    await upsertUser(pool, {
      id: DEV_VIEWER,
      organizationId: DEV_ORG,
      email: 'dev-viewer@earth.local',
      role: 'VIEWER',
      oidcSubject: 'oidc|earth-dev-viewer',
    });
    const token = await signToken({
      sub: 'oidc|earth-dev-viewer',
      role: 'OWNER',
      organizationId: OTHER_ORG,
      org_id: OTHER_ORG,
    });
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: bearerHeaders(token),
      payload: {
        ...demoBody,
        idempotencyKey: 'oidc-claim-override',
        organizationId: OTHER_ORG,
        role: 'OWNER',
      },
    });
    expect(start.statusCode).toBe(403);
    expect(start.json().error.code).toBe('ROLE_FORBIDDEN');
  });

  it('rejects malformed, unsigned, wrong-issuer, wrong-audience, and expired tokens', async () => {
    const cases: Array<{ name: string; token: string }> = [
      { name: 'malformed', token: 'not-a-jwt' },
      {
        name: 'unsigned',
        token: await new UnsecuredJWT({ sub: OWNER_SUBJECT })
          .setIssuer(ISSUER)
          .setAudience(AUDIENCE)
          .setExpirationTime('2h')
          .encode(),
      },
      { name: 'wrong issuer', token: await signToken({ sub: OWNER_SUBJECT, iss: 'https://evil.example/' }) },
      { name: 'wrong audience', token: await signToken({ sub: OWNER_SUBJECT, aud: 'someone-else' }) },
      {
        name: 'expired',
        token: await signToken({
          sub: OWNER_SUBJECT,
          exp: Math.floor(Date.now() / 1000) - 120,
          iat: Math.floor(Date.now() / 1000) - 240,
        }),
      },
      {
        name: 'nbf in the future',
        token: await signToken({
          sub: OWNER_SUBJECT,
          nbf: Math.floor(Date.now() / 1000) + 3600,
        }),
      },
    ];

    for (const testCase of cases) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/material-opportunities/start',
        headers: bearerHeaders(testCase.token),
        payload: { ...demoBody, idempotencyKey: `oidc-bad-${testCase.name}` },
      });
      expect(response.statusCode, testCase.name).toBe(401);
      expect(response.json().error.code, testCase.name).toBe('OIDC_TOKEN_INVALID');
      expect(JSON.stringify(response.json()), testCase.name).not.toMatch(/eyJ/);
    }
  });

  it('rejects development headers in OIDC mode', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: {
        'content-type': 'application/json',
        'x-earth-org-id': DEV_ORG,
        'x-earth-user-id': DEV_USER,
        'x-earth-user-role': 'OWNER',
      },
      payload: { ...demoBody, idempotencyKey: 'oidc-dev-headers' },
    });
    expect(start.statusCode).toBe(401);
    expect(start.json().error.code).toBe('OIDC_TOKEN_MISSING');
  });

  it('keeps cross-tenant reads as 404 under OIDC', async () => {
    const ownerToken = await signToken({ sub: OWNER_SUBJECT });
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: bearerHeaders(ownerToken),
      payload: { ...demoBody, idempotencyKey: 'oidc-tenant-a' },
    });
    expect(start.statusCode).toBe(201);
    const sessionId = start.json().session.id;

    await upsertUser(pool, {
      id: OTHER_USER,
      organizationId: OTHER_ORG,
      organizationName: 'EARTH Development Org B',
      email: 'dev-owner-b@earth.local',
      role: 'OWNER',
      oidcSubject: 'oidc|earth-other-owner',
    });
    const otherToken = await signToken({ sub: 'oidc|earth-other-owner' });
    const stolen = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}`,
      headers: bearerHeaders(otherToken),
    });
    expect(stolen.statusCode).toBe(404);
  });

  it('records actor id and OIDC auth mode on audit events', async () => {
    const token = await signToken({ sub: OWNER_SUBJECT });
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: bearerHeaders(token),
      payload: { ...demoBody, idempotencyKey: 'oidc-audit' },
    });
    expect(start.statusCode).toBe(201);
    const sessionId = start.json().session.id;
    const audit = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: bearerHeaders(token),
    });
    const created = audit
      .json()
      .events.find((event: { eventType: string }) => event.eventType === 'SESSION_CREATED');
    expect(created.actorId).toBe(DEV_USER);
    expect(created.authMode).toBe(AUTH_MODE_OIDC);
    expect(created.metadata.authMode).toBe(AUTH_MODE_OIDC);
  });

  async function signToken(claims: {
    sub: string;
    iss?: string;
    aud?: string;
    exp?: number;
    iat?: number;
    nbf?: number;
    role?: string;
    organizationId?: string;
    org_id?: string;
  }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jwt = new SignJWT({
      role: claims.role,
      organizationId: claims.organizationId,
      org_id: claims.org_id,
    })
      .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
      .setSubject(claims.sub)
      .setIssuer(claims.iss ?? ISSUER)
      .setAudience(claims.aud ?? AUDIENCE)
      .setIssuedAt(claims.iat ?? now);
    if (claims.nbf !== undefined) {
      jwt.setNotBefore(claims.nbf);
    }
    jwt.setExpirationTime(claims.exp ?? now + 3600);
    return jwt.sign(privateKey);
  }
});

function bearerHeaders(token: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  };
}
