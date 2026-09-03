import { Pool } from 'pg';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { loadEnv } from './load-env.js';

loadEnv();

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });

  const app = await buildApp(pool);
  try {
    await app.listen({ host: '0.0.0.0', port: config.port });
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
