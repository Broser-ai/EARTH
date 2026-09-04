import type { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { buildApp, type BuildAppOptions } from '../src/app.js';
import { loadEnv } from '../src/load-env.js';
import { migrate } from '../src/migrate.js';
import type { UserRole } from '../src/contracts.js';

loadEnv();

export const DEV_ORG = '11111111-1111-1111-1111-111111111111';
export const DEV_USER = '22222222-2222-2222-2222-222222222222';
export const DEV_VIEWER = '55555555-5555-5555-5555-555555555555';
export const OTHER_ORG = '33333333-3333-3333-3333-333333333333';
export const OTHER_USER = '44444444-4444-4444-4444-444444444444';
export const DEV_ESG_LEAD = '66666666-6666-6666-6666-666666666666';
export const DEV_OPERATIONS = '77777777-7777-7777-7777-777777777777';
export const DEV_REVIEWER = '88888888-8888-8888-8888-888888888888';

export const devHeaders = {
  'content-type': 'application/json',
  'x-earth-org-id': DEV_ORG,
  'x-earth-user-id': DEV_USER,
  'x-earth-user-role': 'OWNER',
} as const;

export const devHeadersWithoutRole = {
  'content-type': 'application/json',
  'x-earth-org-id': DEV_ORG,
  'x-earth-user-id': DEV_USER,
} as const;

export const otherHeaders = {
  'content-type': 'application/json',
  'x-earth-org-id': OTHER_ORG,
  'x-earth-user-id': OTHER_USER,
  'x-earth-user-role': 'OWNER',
} as const;

export const viewerHeaders = {
  'content-type': 'application/json',
  'x-earth-org-id': DEV_ORG,
  'x-earth-user-id': DEV_VIEWER,
  'x-earth-user-role': 'VIEWER',
} as const;

export const viewerEscalateHeaders = {
  'content-type': 'application/json',
  'x-earth-org-id': DEV_ORG,
  'x-earth-user-id': DEV_VIEWER,
  'x-earth-user-role': 'OWNER',
} as const;

export const demoBody = {
  idempotencyKey: 'demo-hdpe-2026-001',
  materialBatch: {
    externalReference: 'BATCH-2026-001',
    materialClass: 'HDPE_OFFCUTS',
    quantityKg: 15200,
    facilityName: 'Demo Factory Aarhus',
    availableFrom: '2026-09-03T12:00:00.000Z',
  },
  baseline: {
    disposalCostDkk: 38400,
    co2eKg: 4800,
  },
  evidence: {
    documentIds: [] as string[],
    extractionRequested: false,
  },
  dataClassification: 'CONFIDENTIAL' as const,
};

export async function createPool(): Promise<Pool> {
  const databaseUrl = process.env.DATABASE_URL ?? 'postgres://earth:earth@localhost:5432/earth';
  process.env.DATABASE_URL = databaseUrl;
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    await pool.end();
    throw new Error(
      `Postgres is not reachable at DATABASE_URL. Start it with: docker compose up -d\n${String(error)}`,
    );
  }
  await migrate(pool);
  await upsertUser(pool, {
    id: OTHER_USER,
    organizationId: OTHER_ORG,
    organizationName: 'EARTH Development Org B',
    email: 'dev-owner-b@earth.local',
    role: 'OWNER',
  });
  await upsertUser(pool, {
    id: DEV_ESG_LEAD,
    organizationId: DEV_ORG,
    email: 'dev-esg-lead@earth.local',
    role: 'ESG_LEAD',
  });
  await upsertUser(pool, {
    id: DEV_OPERATIONS,
    organizationId: DEV_ORG,
    email: 'dev-operations@earth.local',
    role: 'OPERATIONS',
  });
  await upsertUser(pool, {
    id: DEV_REVIEWER,
    organizationId: DEV_ORG,
    email: 'dev-reviewer@earth.local',
    role: 'REVIEWER',
  });
  return pool;
}

export async function upsertUser(
  pool: Pool,
  args: {
    id: string;
    organizationId: string;
    organizationName?: string;
    email: string;
    role: UserRole;
    oidcSubject?: string | null;
  },
): Promise<void> {
  if (args.organizationName) {
    await pool.query(
      `INSERT INTO organizations (id, name)
       VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      [args.organizationId, args.organizationName],
    );
  }
  await pool.query(
    `INSERT INTO users (id, organization_id, email, role, oidc_subject)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       role = EXCLUDED.role,
       oidc_subject = COALESCE(EXCLUDED.oidc_subject, users.oidc_subject)`,
    [args.id, args.organizationId, args.email.toLowerCase(), args.role, args.oidcSubject ?? null],
  );
  await pool.query(
    `INSERT INTO organization_memberships (user_id, organization_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role`,
    [args.id, args.organizationId, args.role],
  );
}

export async function resetWorkflowTables(pool: Pool): Promise<void> {
  await pool.query(
    `TRUNCATE audit_events, execution_tasks, execution_sessions, material_batches RESTART IDENTITY CASCADE`,
  );
}

export async function createTestApp(pool: Pool, options?: BuildAppOptions): Promise<FastifyInstance> {
  return buildApp(pool, options);
}

export function roleHeaders(userId: string, roleHeader?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-earth-org-id': DEV_ORG,
    'x-earth-user-id': userId,
  };
  if (roleHeader) {
    headers['x-earth-user-role'] = roleHeader;
  }
  return headers;
}

export async function drainSession(
  app: FastifyInstance,
  sessionId: string,
  headers: Record<string, string> = { ...devHeaders },
) {
  const terminal = new Set([
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'BUDGET_STOPPED',
    'EXPIRED',
  ]);
  let last = await app.inject({
    method: 'POST',
    url: `/v1/sessions/${sessionId}/run-next`,
    headers,
  });
  for (let i = 0; i < 8; i += 1) {
    const body = last.json() as { claimedTask?: unknown; session?: { state?: string } };
    if (last.statusCode !== 200) {
      return last;
    }
    if (!body.claimedTask || (body.session?.state && terminal.has(body.session.state))) {
      return last;
    }
    last = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers,
    });
  }
  return last;
}
