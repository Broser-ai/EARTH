import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { migrate } from '../src/migrate.js';
import { createPool } from './helpers.js';

const EXPECTED_MIGRATIONS = [
  '001_init.sql',
  '002_dev_seed.sql',
  '003_dev_viewer_seed.sql',
  '004_oidc_memberships.sql',
  '005_evidence_approvals.sql',
  '006_prime_multi_session.sql',
  '007_integration_control_plane.sql',
];

describe('canonical migrate path', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = await createPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('records every SQL migration and is idempotent', async () => {
    const applied = await pool.query<{ id: string }>(
      'SELECT id FROM schema_migrations ORDER BY id',
    );
    expect(applied.rows.map((row) => row.id)).toEqual(EXPECTED_MIGRATIONS);

    const second = await migrate(pool);
    expect(second).toEqual([]);

    const tables = await pool.query<{ relname: string }>(
      `SELECT relname FROM pg_class
        WHERE relkind = 'r'
          AND relname = ANY($1::text[])
        ORDER BY relname`,
      [
        [
          'audit_events',
          'execution_sessions',
          'evidence_records',
          'integration_operations',
          'organization_memberships',
          'users',
        ],
      ],
    );
    expect(tables.rows.map((row) => row.relname)).toEqual([
      'audit_events',
      'evidence_records',
      'execution_sessions',
      'integration_operations',
      'organization_memberships',
      'users',
    ]);
  });
});
