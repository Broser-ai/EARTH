import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, '../../..');
  loadDotenv({ path: resolve(repoRoot, '.env') });
  loadDotenv({ path: resolve(here, '../.env') });
}
