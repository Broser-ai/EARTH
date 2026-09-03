import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { loadEnv } from './load-env.js';

loadEnv();

const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');

export async function migrate(pool: Pool): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const applied: string[] = [];
  for (const file of files) {
    const existing = await pool.query('SELECT 1 FROM schema_migrations WHERE id = $1', [file]);
    if (existing.rowCount && existing.rowCount > 0) {
      continue;
    }

    const sql = await readFile(resolve(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      applied.push(file);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return applied;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. See .env.example.');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const applied = await migrate(pool);
    if (applied.length === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`Applied migrations: ${applied.join(', ')}`);
    }
  } finally {
    await pool.end();
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
