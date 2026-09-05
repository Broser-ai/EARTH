import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { AUTH_MODE_DEVELOPMENT } from '../src/auth/types.js';
import {
  createPool,
  createTestApp,
  demoBody,
  DEV_ORG,
  DEV_USER,
  DEV_VIEWER,
  devHeaders,
  otherHeaders,
  OTHER_ORG,
  resetWorkflowTables,
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

  it('loads role from organization_memberships.role, not from x-earth-user-role', async () => {
    const stored = await pool.query<{ role: string }>(
      `SELECT role FROM organization_memberships WHERE user_id = $1 AND organization_id = $2 AND status = 'ACTIVE'`,
      [DEV_VIEWER, DEV_ORG],
    );
    expect(stored.rows[0]?.role).toBe('VIEWER');

    const ownerStored = await pool.query<{ role: string }>(
      `SELECT role FROM organization_memberships WHERE user_id = $1 AND organization_id = $2 AND status = 'ACTIVE'`,
      [DEV_USER, DEV_ORG],
    );
    expect(ownerStored.rows[0]?.role).toBe('OWNER');
  });

  it('does not escalate when users.role is OWNER but membership role stays VIEWER', async () => {
    await pool.query(`UPDATE users SET role = 'OWNER' WHERE id = $1`, [DEV_VIEWER]);
    try {
      const start = await app.inject({
        method: 'POST',
        url: '/v1/material-opportunities/start',
        headers: viewerHeaders,
        payload: { ...demoBody, idempotencyKey: 'users-role-drift' },
      });
      expect(start.statusCode).toBe(403);
      expect(start.json().error.code).toBe('FORBIDDEN');
    } finally {
      await pool.query(`UPDATE users SET role = 'VIEWER' WHERE id = $1`, [DEV_VIEWER]);
    }
  });

  it('cannot escalate by changing x-earth-user-role to OWNER', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: viewerEscalateHeaders,
      payload: { ...demoBody, idempotencyKey: 'viewer-escalate' },
    });
    expect(start.statusCode).toBe(403);
    expect(start.json().mode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(start.json().error.code).toBe('FORBIDDEN');

    const count = await pool.query(
      `SELECT count(*)::int AS n FROM execution_sessions WHERE organization_id = $1`,
      [DEV_ORG],
    );
    expect(count.rows[0].n).toBe(0);
  });

  it('ignores client-supplied organization and role headers', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: { ...devHeaders, 'x-earth-org-id': OTHER_ORG, 'x-earth-user-role': 'VIEWER' },
      payload: { ...demoBody, idempotencyKey: 'ignored-development-headers' },
    });
    expect(start.statusCode).toBe(201);
    const sessionId = start.json().session.id;
    const stored = await pool.query<{ organization_id: string }>(
      'SELECT organization_id FROM execution_sessions WHERE id = $1',
      [sessionId],
    );
    expect(stored.rows[0]?.organization_id).toBe(DEV_ORG);
  });

  it('rejects unknown and suspended development users', async () => {
    const unknown = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: { 'x-earth-user-id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      payload: { ...demoBody, idempotencyKey: 'unknown-development-user' },
    });
    expect(unknown.statusCode).toBe(401);
    expect(unknown.json().error.code).toBe('AUTHENTICATION_REQUIRED');

    await pool.query(`UPDATE organization_memberships SET status = 'SUSPENDED' WHERE user_id = $1`, [DEV_USER]);
    const suspended = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'suspended-development-user' },
    });
    expect(suspended.statusCode).toBe(403);
    expect(suspended.json().error.code).toBe('FORBIDDEN');
    await pool.query(`UPDATE organization_memberships SET status = 'ACTIVE' WHERE user_id = $1`, [DEV_USER]);
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

    const run = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: viewerEscalateHeaders,
    });
    expect(run.statusCode).toBe(403);
    expect(run.json().error.code).toBe('FORBIDDEN');

    const audit = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: viewerHeaders,
    });
    expect(audit.statusCode).toBe(403);
    expect(audit.json().error.code).toBe('FORBIDDEN');
  });

  it('does not let body organizationId override TenantContext', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: {
        ...demoBody,
        idempotencyKey: 'body-org-override',
        organizationId: OTHER_ORG,
      },
    });
    expect(start.statusCode).toBe(201);
    const sessionId = start.json().session.id;

    const row = await pool.query<{ organization_id: string }>(
      `SELECT organization_id FROM execution_sessions WHERE id = $1`,
      [sessionId],
    );
    expect(row.rows[0]?.organization_id).toBe(DEV_ORG);
    expect(row.rows[0]?.organization_id).not.toBe(OTHER_ORG);

    const stolen = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}?organizationId=${OTHER_ORG}`,
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

  it('stamps DEVELOPMENT_ONLY only because the development AuthProvider is active', async () => {
    expect(app.earthAuthProvider?.authMode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(app.earthAuthMode).toBe(AUTH_MODE_DEVELOPMENT);

    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'mode-from-provider' },
    });
    expect(start.json().mode).toBe(AUTH_MODE_DEVELOPMENT);
    expect(start.headers['x-earth-mode']).toBe(AUTH_MODE_DEVELOPMENT);
  });
});
