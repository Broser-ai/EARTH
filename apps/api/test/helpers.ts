import type { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/load-env.js';
import { migrate } from '../src/migrate.js';

loadEnv();

export const DEV_ORG = '11111111-1111-1111-1111-111111111111';
export const DEV_USER = '22222222-2222-2222-2222-222222222222';
export const OTHER_ORG = '33333333-3333-3333-3333-333333333333';
export const OTHER_USER = '44444444-4444-4444-4444-444444444444';

export const devHeaders = {
  'content-type': 'application/json',
  'x-earth-org-id': DEV_ORG,
  'x-earth-user-id': DEV_USER,
  'x-earth-user-role': 'OWNER',
} as const;

export const otherHeaders = {
  'content-type': 'application/json',
  'x-earth-org-id': OTHER_ORG,
  'x-earth-user-id': OTHER_USER,
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
  await pool.query(
    `INSERT INTO organizations (id, name)
     VALUES ($1, 'EARTH Development Org B')
     ON CONFLICT (id) DO NOTHING`,
    [OTHER_ORG],
  );
  await pool.query(
    `INSERT INTO users (id, organization_id, email, role)
     VALUES ($1, $2, 'dev-owner-b@earth.local', 'OWNER')
     ON CONFLICT (id) DO NOTHING`,
    [OTHER_USER, OTHER_ORG],
  );
  return pool;
}

export async function resetWorkflowTables(pool: Pool): Promise<void> {
  await pool.query(
    `TRUNCATE audit_events, execution_tasks, execution_sessions, material_batches RESTART IDENTITY CASCADE`,
  );
}

export async function createTestApp(pool: Pool): Promise<FastifyInstance> {
  return buildApp(pool);
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
