export function loadConfig(): {
  databaseUrl: string;
  port: number;
} {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. See .env.example.');
  }

  const rawPort = process.env.PORT ?? '3001';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, got ${rawPort}`);
  }

  return { databaseUrl, port };
}
