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
];

const qualificationPattern =
  /\b(DEMO|NOT_CONFIGURED|NOT_CONNECTED|NOT VERIFIED|ESTIMATED|INPUT_UNVERIFIED|DEVELOPMENT_ONLY)\b/i;

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    }),
  );
  return files.flat();
}

describe('product-truth claims', () => {
  it('requires nearby honesty labels for forbidden claims in user-facing source', async () => {
    const violations: string[] = [];

    for (const file of await sourceFiles('src')) {
      const source = await readFile(file, 'utf8');
      for (const claim of forbiddenClaims) {
        for (const match of source.matchAll(new RegExp(claim, 'gi'))) {
          const start = Math.max(0, (match.index ?? 0) - 180);
          const end = Math.min(source.length, (match.index ?? 0) + claim.length + 180);
          if (!qualificationPattern.test(source.slice(start, end))) {
            violations.push(`${file}: unqualified claim "${match[0]}"`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
