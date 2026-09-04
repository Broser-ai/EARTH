import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const forbiddenClaims = [
  'KPMG audited',
  'SBTi validated',
  'ISO 14064-1 Certified',
  'Post-Quantum ZK-STARK',
  'DATEV connected',
  'Slack connected',
  'CSRD compliant',
  'CSRD-ready',
  'EU AI Act compliant',
  'blockchain verified',
  'trained RL',
  'autonomous compliance',
  'live recycler network',
  'Post-Quantum Crypto',
  'live Roboflow',
  'Tinker connected',
  'Inkling trained',
  'autonomous agent',
  'autonomous execution',
  'verified digital product passport',
  'live carbon data',
];

const qualificationPattern =
  /\b(DEMO|DEVELOPMENT_ONLY|NOT_CONFIGURED|NOT_CONNECTED|NOT VERIFIED|ESTIMATED|INPUT_UNVERIFIED|STUB|PROTOTYPE|SIMULATION)\b/i;
const sourceRoots = ['src', 'apps', 'packages'];
const excludedDirectories = new Set(['node_modules', 'dist', 'coverage']);

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return excludedDirectories.has(entry.name) ? [] : sourceFiles(path);
      return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    }),
  );
  return files.flat();
}

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
}

describe('product-truth claims', () => {
  it('requires nearby honesty labels for forbidden claims in user-facing source', async () => {
    const violations: string[] = [];

    for (const root of sourceRoots) {
      for (const file of await sourceFiles(root)) {
        const source = await readFile(file, 'utf8');
        const userFacingSource = withoutComments(source);
        for (const claim of forbiddenClaims) {
          for (const match of userFacingSource.matchAll(new RegExp(claim, 'gi'))) {
            const start = Math.max(0, (match.index ?? 0) - 180);
            const end = Math.min(userFacingSource.length, (match.index ?? 0) + claim.length + 180);
            if (!qualificationPattern.test(userFacingSource.slice(start, end))) {
              violations.push(`${file}: unqualified claim "${match[0]}"`);
            }
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
