import { Pool } from 'pg';
import { buildApp } from './app.js';
import { loadConfig, requireDatabaseUrl } from './config.js';
import { loadEnv } from './load-env.js';

loadEnv();

async function main(): Promise<void> {
  const { host, port, databaseUrl } = loadConfig();
  const pool = new Pool({ connectionString: requireDatabaseUrl(databaseUrl) });
  const app = await buildApp(pool);

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await pool.end();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  try {
    await app.listen({ host, port });
  } catch (error) {
    app.log.error(error);
    await pool.end();
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
