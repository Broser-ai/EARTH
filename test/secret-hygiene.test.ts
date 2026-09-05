import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readEarthSecret, readEarthSecretPresence } from '../src/sovereign/config/env.ts';

const repoRoot = process.cwd();

describe('secret hygiene', () => {
  it('does not type adapter secrets as VITE_* on ImportMetaEnv', async () => {
    const source = await readFile(resolve(repoRoot, 'src/vite-env.d.ts'), 'utf8');
    expect(source).not.toMatch(/VITE_ROBOFLOW_API_KEY/);
    expect(source).not.toMatch(/VITE_TINKER_API_KEY/);
    expect(source).not.toMatch(/VITE_INKLING_WEIGHTS_URI/);
  });

  it('does not read VITE_ copies of adapter secrets', async () => {
    const source = await readFile(resolve(repoRoot, 'src/sovereign/config/env.ts'), 'utf8');
    expect(source).not.toMatch(/env\[`VITE_\$\{name\}`\]/);
    expect(source).not.toMatch(/readViteEnv\(`VITE_\$\{name\}`\)/);
  });

  it('ignores VITE_ROBOFLOW_API_KEY in process.env', () => {
    const previous = process.env.VITE_ROBOFLOW_API_KEY;
    const previousPlain = process.env.ROBOFLOW_API_KEY;
    process.env.VITE_ROBOFLOW_API_KEY = 'must-not-be-read';
    delete process.env.ROBOFLOW_API_KEY;
    try {
      expect(readEarthSecret('ROBOFLOW_API_KEY')).toBeUndefined();
      expect(readEarthSecretPresence().roboflowApiKey).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.VITE_ROBOFLOW_API_KEY;
      } else {
        process.env.VITE_ROBOFLOW_API_KEY = previous;
      }
      if (previousPlain === undefined) {
        delete process.env.ROBOFLOW_API_KEY;
      } else {
        process.env.ROBOFLOW_API_KEY = previousPlain;
      }
    }
  });
});
