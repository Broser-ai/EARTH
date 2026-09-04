const DEFAULT_PORT = 3001;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): {
  port: number;
  host: '0.0.0.0';
} {
  const rawPort = env.PORT ?? String(DEFAULT_PORT);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, got ${rawPort}`);
  }

  return { port, host: '0.0.0.0' };
}
