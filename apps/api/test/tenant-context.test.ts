import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AUTH_MODE_DEVELOPMENT } from '../src/auth/types.js';
import { DevelopmentHeaderAuthProvider } from '../src/auth/development-provider.js';
import {
  createPool,
  createTestApp,
  demoBody,
  DEV_ESG_LEAD,
  DEV_OPERATIONS,
  DEV_ORG,
  DEV_REVIEWER,
  DEV_USER,
  DEV_VIEWER,
  devHeaders,
  devHeadersWithoutRole,
  otherHeaders,
  OTHER_ORG,
  resetWorkflowTables,
  roleHeaders,
  viewerEscalateHeaders,
  viewerHeaders,
} from './helpers.js';

describe('TenantContext and DEVELOPMENT AuthProvider', () => {
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
    await resetWorkflowTables(pool);
  });

  it('loads role from Postgres users.role and ignores x-earth-user-role', async () => {
    const stored = await pool.query<{ role: string }>(
      `SELECT role FROM users WHERE id = $1 AND organization_id = $2`,
      [DEV_VIEWER, DEV_ORG],
    );
    expect(stored.rows[0]?.role).toBe('VIEWER');

    const ownerStored = await pool.query<{ role: string }>(
      `SELECT role FROM users WHERE id = $1 AND organization_id = $2`,
      [DEV_USER, DEV_ORG],
    );
    expect(ownerStored.rows[0]?.role).toBe('OWNER');
  });

  it('authenticates the seeded OWNER without x-earth-user-role', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeadersWithoutRole,
      payload: { ...demoBody, idempotencyKey: 'no-role-header' },
    });
    expect(start.statusCode).toBe(201);
    expect(start.json().mode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(start.json().session.id).toBeTruthy();
  });

  it('cannot escalate by sending x-earth-user-role OWNER on a VIEWER row', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: viewerEscalateHeaders,
      payload: { ...demoBody, idempotencyKey: 'viewer-escalate' },
    });
    expect(start.statusCode).toBe(403);
    expect(start.json().mode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(start.json().error.code).toBe('ROLE_FORBIDDEN');

    const count = await pool.query(
      `SELECT count(*)::int AS n FROM execution_sessions WHERE organization_id = $1`,
      [DEV_ORG],
    );
    expect(count.rows[0].n).toBe(0);
  });

  it('does not let VIEWER start or run even when the role header is omitted', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: roleHeaders(DEV_VIEWER),
      payload: { ...demoBody, idempotencyKey: 'viewer-no-header' },
    });
    expect(start.statusCode).toBe(403);
    expect(start.json().error.code).toBe('ROLE_FORBIDDEN');
  });

  it('lets VIEWER read a session but not run-next', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'viewer-read' },
    });
    expect(created.statusCode).toBe(201);
    const sessionId = created.json().session.id;

    const read = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}`,
      headers: viewerHeaders,
    });
    expect(read.statusCode).toBe(200);
    expect(read.json().mode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(read.json().session.id).toBe(sessionId);

    const audit = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: viewerHeaders,
    });
    expect(audit.statusCode).toBe(200);

    const run = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: viewerEscalateHeaders,
    });
    expect(run.statusCode).toBe(403);
    expect(run.json().error.code).toBe('ROLE_FORBIDDEN');
  });

  it('lets ESG_LEAD and OPERATIONS start and run, and REVIEWER read only', async () => {
    const esg = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: roleHeaders(DEV_ESG_LEAD, 'VIEWER'),
      payload: { ...demoBody, idempotencyKey: 'esg-lead-start' },
    });
    expect(esg.statusCode).toBe(201);
    const esgSession = esg.json().session.id;
    const esgRun = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${esgSession}/run-next`,
      headers: roleHeaders(DEV_ESG_LEAD, 'VIEWER'),
    });
    expect(esgRun.statusCode).toBe(200);

    const ops = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: roleHeaders(DEV_OPERATIONS),
      payload: { ...demoBody, idempotencyKey: 'operations-start' },
    });
    expect(ops.statusCode).toBe(201);
    const opsRun = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${ops.json().session.id}/run-next`,
      headers: roleHeaders(DEV_OPERATIONS),
    });
    expect(opsRun.statusCode).toBe(200);

    const reviewerStart = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: roleHeaders(DEV_REVIEWER, 'OWNER'),
      payload: { ...demoBody, idempotencyKey: 'reviewer-start' },
    });
    expect(reviewerStart.statusCode).toBe(403);

    const reviewerRead = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${esgSession}`,
      headers: roleHeaders(DEV_REVIEWER, 'OWNER'),
    });
    expect(reviewerRead.statusCode).toBe(200);

    const reviewerRun = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${esgSession}/run-next`,
      headers: roleHeaders(DEV_REVIEWER),
    });
    expect(reviewerRun.statusCode).toBe(403);
  });

  it('does not let body organizationId, role, or userId override TenantContext', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: {
        ...demoBody,
        idempotencyKey: 'body-org-override',
        organizationId: OTHER_ORG,
        role: 'VIEWER',
        userId: DEV_VIEWER,
        actorId: DEV_VIEWER,
      },
    });
    expect(start.statusCode).toBe(201);
    const sessionId = start.json().session.id;

    const row = await pool.query<{ organization_id: string; created_by: string }>(
      `SELECT organization_id, created_by FROM execution_sessions WHERE id = $1`,
      [sessionId],
    );
    expect(row.rows[0]?.organization_id).toBe(DEV_ORG);
    expect(row.rows[0]?.organization_id).not.toBe(OTHER_ORG);
    expect(row.rows[0]?.created_by).toBe(DEV_USER);

    const stolen = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}?organizationId=${OTHER_ORG}&role=OWNER`,
      headers: otherHeaders,
    });
    expect(stolen.statusCode).toBe(404);

    const own = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}?organizationId=${OTHER_ORG}`,
      headers: devHeaders,
    });
    expect(own.statusCode).toBe(200);
    expect(own.json().session.id).toBe(sessionId);
  });

  it('isolates sessions across tenant contexts', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'tenant-a' },
    });
    const sessionId = start.json().session.id;

    const stolen = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}`,
      headers: otherHeaders,
    });
    expect(stolen.statusCode).toBe(404);

    const stolenRun = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: otherHeaders,
    });
    expect(stolenRun.statusCode).toBe(404);

    const stolenAudit = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: otherHeaders,
    });
    expect(stolenAudit.statusCode).toBe(404);
  });

  it('records actor id and DEVELOPMENT_ONLY auth mode on audit events', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeadersWithoutRole,
      payload: { ...demoBody, idempotencyKey: 'audit-actor-dev' },
    });
    expect(start.statusCode).toBe(201);
    const sessionId = start.json().session.id;

    const audit = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: devHeadersWithoutRole,
    });
    expect(audit.statusCode).toBe(200);
    const created = audit
      .json()
      .events.find((event: { eventType: string }) => event.eventType === 'SESSION_CREATED');
    expect(created.actorId).toBe(DEV_USER);
    expect(created.authMode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(created.metadata.authMode).toBe(AUTH_MODE_DEVELOPMENT);
  });

  it('stamps DEVELOPMENT_ONLY only because the development AuthProvider is active', async () => {
    expect(app.earthAuthProvider?.authMode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(app.earthAuthMode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(app.earthOidcConfigured).toBe(false);

    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'mode-from-provider' },
    });
    expect(start.json().mode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(start.headers['x-earth-mode']).toBe(AUTH_MODE_DEVELOPMENT);
  });

  it('disables development headers when the provider is constructed outside development', async () => {
    const provider = new DevelopmentHeaderAuthProvider(pool, {
      nodeEnv: 'production',
      authModeSetting: 'development',
    });
    await expect(
      provider.getActor({
        headers: devHeaders,
      } as never),
    ).rejects.toMatchObject({ code: 'DEVELOPMENT_AUTH_DISABLED', status: 401 });
  });
});
