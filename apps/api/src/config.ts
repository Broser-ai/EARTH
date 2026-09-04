const DEFAULT_PORT = 3001;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): {
  port: number;
  host: '0.0.0.0';
  databaseUrl: string | undefined;
} {
  const rawPort = env.PORT ?? String(DEFAULT_PORT);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, got ${rawPort}`);
  }

  const databaseUrl = env.DATABASE_URL?.trim() || undefined;

  return { port, host: '0.0.0.0', databaseUrl };
}

export function requireDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. See .env.example.');
  }
  return databaseUrl;
}
