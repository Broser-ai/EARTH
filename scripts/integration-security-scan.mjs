#!/usr/bin/env node
/**
 * Fail closed if production integration source contains browser secrets,
 * localStorage, or a CONNECTED grant (`connected: true`).
 *
 * Excludes tests. The VITE_ deny-list in config.ts is allowed because it
 * refuses process start; any other VITE_ occurrence fails the scan.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../apps/api/src/integrations', import.meta.url)));
const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));

const findings = [];

async function walk(dir) {
  const entries = await readdir(dir);
  for (const name of entries) {
    const full = join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === 'test') {
        continue;
      }
      await walk(full);
      continue;
    }
    if (!/\.(ts|js|mjs|cjs)$/.test(name)) {
      continue;
    }
    if (/\.test\./.test(name) || /\.spec\./.test(name)) {
      continue;
    }
    const source = await readFile(full, 'utf8');
    const rel = relative(REPO, full);
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const lineNo = index + 1;
      if (/localStorage/.test(line)) {
        findings.push({ file: rel, line: lineNo, rule: 'localStorage', text: line.trim() });
      }
      if (/connected\s*:\s*true/.test(line) || /"connected"\s*:\s*true/.test(line)) {
        findings.push({ file: rel, line: lineNo, rule: 'connected: true', text: line.trim() });
      }
      if (/VITE_/.test(line) && !isAllowedViteGuard(line)) {
        findings.push({ file: rel, line: lineNo, rule: 'VITE_', text: line.trim() });
      }
    }
  }
}

function isAllowedViteGuard(line) {
  return (
    /startsWith\(\s*['"]VITE_['"]\s*\)/.test(line) ||
    /VITE_\* integration secrets are forbidden/.test(line) ||
    /VITE_\* variants/.test(line)
  );
}

await walk(ROOT);

if (findings.length > 0) {
  console.error('FAIL integration security scan');
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line} [${finding.rule}] ${finding.text}`);
  }
  process.exit(1);
}

console.log('PASS integration security scan: no VITE_, localStorage, or connected: true in apps/api/src/integrations');
process.exit(0);
