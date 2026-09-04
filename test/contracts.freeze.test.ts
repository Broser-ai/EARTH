import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as contracts from '../src/contracts';
import * as packageContracts from '../packages/earth-contracts/src/index';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SPEC_SESSION_STATES = [
  'QUEUED',
  'RUNNING',
  'WAITING_FOR_DEPENDENCY',
  'WAITING_FOR_APPROVAL',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'BUDGET_STOPPED',
  'EXPIRED',
] as const;

const SPEC_TASK_TYPES = [
  'VALIDATE_BATCH',
  'CHECK_EVIDENCE',
  'CALCULATE_BASELINE',
  'FIND_CANDIDATE_ROUTES',
  'NANOCHAT_EXTRACT',
] as const;

const SPEC_TASK_STATES = [
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'PARTIAL',
  'ABSTAINED',
  'FAILED',
  'BLOCKED',
  'NOT_CONFIGURED',
  'CANCELLED',
] as const;

const SPEC_REASON_CODES = [
  'INVALID_QUANTITY',
  'MATERIAL_CLASS_REQUIRED',
  'EVIDENCE_MISSING',
  'NANOCHAT_RESTRICTED_DATA_BLOCK',
  'NANOCHAT_NOT_CONFIGURED',
  'BUDGET_EXCEEDED',
  'INVALID_STATE_TRANSITION',
  'TASK_RETRY_EXHAUSTED',
  'RECYCLER_NETWORK_NOT_CONNECTED',
] as const;

const SPEC_HONESTY_LABELS = [
  'NOT_CONFIGURED',
  'NOT_CONNECTED',
  'DEMO',
  'ESTIMATED',
  'INPUT_UNVERIFIED',
] as const;

const SPEC_USER_ROLES = ['OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER', 'VIEWER'] as const;
const SPEC_DATA_CLASSIFICATIONS = ['INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const;
const SPEC_ACTOR_TYPES = ['USER', 'SYSTEM', 'WORKER'] as const;
const SPEC_NEXT_ACTIONS = ['UPLOAD_EVIDENCE', 'RUN_NEXT', 'NONE'] as const;
const SPEC_TERMINAL_SESSION_STATES = [
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'BUDGET_STOPPED',
  'EXPIRED',
] as const;

const REQUIRED_PROMPT_STRINGS = [
  'DEVELOPMENT_ONLY',
  'INPUT_UNVERIFIED',
  'NOT_CONFIGURED',
  'NOT_CONNECTED',
  'EVIDENCE_MISSING',
  'RECYCLER_NETWORK_NOT_CONNECTED',
] as const;

function extractTsUnion(markdown: string, typeName: string): string[] {
  const match = markdown.match(new RegExp(`type ${typeName}\\s*=\\s*([\\s\\S]*?);`));
  if (!match) {
    throw new Error(`SHARED_CONTRACTS.md is missing type ${typeName}`);
  }
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function extractHonestyLabels(markdown: string): string[] {
  const section = markdown.split('## Honesty labels')[1];
  if (!section) {
    throw new Error('SHARED_CONTRACTS.md is missing Honesty labels');
  }
  const table = section.split('\n---')[0];
  return [...table.matchAll(/^\| `([A-Z0-9_]+)` \|/gm)].map((entry) => entry[1]);
}

function extractConstArray(source: string, name: string): string[] {
  const match = source.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`));
  if (!match) {
    throw new Error(`missing export const ${name}`);
  }
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function extractConstString(source: string, name: string): string {
  const match = source.match(new RegExp(`export const ${name} = '([^']+)' as const`));
  if (!match) {
    throw new Error(`missing export const ${name}`);
  }
  return match[1];
}

describe('shared contracts freeze', () => {
  const spec = readFileSync(resolve(rootDir, 'docs/SHARED_CONTRACTS.md'), 'utf8');
  const apiSource = readFileSync(resolve(rootDir, 'apps/api/src/contracts.ts'), 'utf8');
  const packageSource = readFileSync(
    resolve(rootDir, 'packages/earth-contracts/src/index.ts'),
    'utf8',
  );

  it('matches docs/SHARED_CONTRACTS.md unions and honesty table exactly', () => {
    expect([...contracts.SESSION_STATES]).toEqual(extractTsUnion(spec, 'SessionState'));
    expect([...contracts.TASK_TYPES]).toEqual(extractTsUnion(spec, 'TaskType'));
    expect([...contracts.TASK_STATES]).toEqual(extractTsUnion(spec, 'TaskState'));
    expect([...contracts.REASON_CODES]).toEqual(extractTsUnion(spec, 'ReasonCode'));
    expect([...contracts.USER_ROLES]).toEqual(extractTsUnion(spec, 'UserRole'));
    expect([...contracts.DATA_CLASSIFICATIONS]).toEqual(extractTsUnion(spec, 'DataClassification'));
    expect([...contracts.ACTOR_TYPES]).toEqual(extractTsUnion(spec, 'ActorType'));
    expect([...contracts.NEXT_ACTIONS]).toEqual(extractTsUnion(spec, 'NextRecommendedAction'));
    expect([...contracts.HONESTY_LABELS]).toEqual(extractHonestyLabels(spec));
  });

  it('matches the hardcoded spec lists (single-character drift fails)', () => {
    expect(contracts.DEVELOPMENT_MODE).toBe('DEVELOPMENT_ONLY');
    expect(contracts.WORKFLOW_TYPE).toBe('MATERIAL_OPPORTUNITY_INTAKE');
    expect(contracts.WORKFLOW_VERSION).toBe('0.1');
    expect(contracts.POLICY_VERSION).toBe('prime-v0.1');
    expect([...contracts.SESSION_STATES]).toEqual([...SPEC_SESSION_STATES]);
    expect([...contracts.TASK_TYPES]).toEqual([...SPEC_TASK_TYPES]);
    expect([...contracts.TASK_STATES]).toEqual([...SPEC_TASK_STATES]);
    expect([...contracts.REASON_CODES]).toEqual([...SPEC_REASON_CODES]);
    expect([...contracts.HONESTY_LABELS]).toEqual([...SPEC_HONESTY_LABELS]);
    expect([...contracts.USER_ROLES]).toEqual([...SPEC_USER_ROLES]);
    expect([...contracts.DATA_CLASSIFICATIONS]).toEqual([...SPEC_DATA_CLASSIFICATIONS]);
    expect([...contracts.ACTOR_TYPES]).toEqual([...SPEC_ACTOR_TYPES]);
    expect([...contracts.NEXT_ACTIONS]).toEqual([...SPEC_NEXT_ACTIONS]);
    expect([...contracts.TERMINAL_SESSION_STATES]).toEqual([...SPEC_TERMINAL_SESSION_STATES]);
    expect([...contracts.REQUIRED_PROMPT_STRINGS]).toEqual([...REQUIRED_PROMPT_STRINGS]);
  });

  it('keeps SPA re-export identical to packages/earth-contracts', () => {
    expect(contracts.SESSION_STATES).toEqual(packageContracts.SESSION_STATES);
    expect(contracts.TASK_TYPES).toEqual(packageContracts.TASK_TYPES);
    expect(contracts.TASK_STATES).toEqual(packageContracts.TASK_STATES);
    expect(contracts.REASON_CODES).toEqual(packageContracts.REASON_CODES);
    expect(contracts.HONESTY_LABELS).toEqual(packageContracts.HONESTY_LABELS);
    expect(contracts.DEVELOPMENT_MODE).toBe(packageContracts.DEVELOPMENT_MODE);
    expect(contracts.REQUIRED_PROMPT_STRINGS).toEqual(packageContracts.REQUIRED_PROMPT_STRINGS);
  });

  it('keeps the API duplicate byte-equal on frozen arrays', () => {
    const names = [
      'HONESTY_LABELS',
      'USER_ROLES',
      'SESSION_STATES',
      'TERMINAL_SESSION_STATES',
      'TASK_TYPES',
      'TASK_STATES',
      'DATA_CLASSIFICATIONS',
      'ACTOR_TYPES',
      'REASON_CODES',
      'NEXT_ACTIONS',
      'REQUIRED_PROMPT_STRINGS',
    ] as const;

    for (const name of names) {
      expect(extractConstArray(apiSource, name), name).toEqual(
        extractConstArray(packageSource, name),
      );
    }

    expect(extractConstString(apiSource, 'DEVELOPMENT_MODE')).toBe(
      extractConstString(packageSource, 'DEVELOPMENT_MODE'),
    );
    expect(extractConstString(apiSource, 'WORKFLOW_TYPE')).toBe(
      extractConstString(packageSource, 'WORKFLOW_TYPE'),
    );
    expect(extractConstString(apiSource, 'WORKFLOW_VERSION')).toBe(
      extractConstString(packageSource, 'WORKFLOW_VERSION'),
    );
    expect(extractConstString(apiSource, 'POLICY_VERSION')).toBe(
      extractConstString(packageSource, 'POLICY_VERSION'),
    );
  });

  it('exposes every prompt-required string in code', () => {
    const published = new Set<string>([
      contracts.DEVELOPMENT_MODE,
      ...contracts.HONESTY_LABELS,
      ...contracts.TASK_STATES,
      ...contracts.REASON_CODES,
    ]);

    for (const token of REQUIRED_PROMPT_STRINGS) {
      expect(published.has(token), token).toBe(true);
    }
  });

  it('snapshots the frozen enums so a renamed member fails CI', () => {
    expect(contracts.SESSION_STATES).toMatchInlineSnapshot(`
      [
        "QUEUED",
        "RUNNING",
        "WAITING_FOR_DEPENDENCY",
        "WAITING_FOR_APPROVAL",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "BUDGET_STOPPED",
        "EXPIRED",
      ]
    `);
    expect(contracts.TASK_TYPES).toMatchInlineSnapshot(`
      [
        "VALIDATE_BATCH",
        "CHECK_EVIDENCE",
        "CALCULATE_BASELINE",
        "FIND_CANDIDATE_ROUTES",
        "NANOCHAT_EXTRACT",
      ]
    `);
    expect(contracts.REASON_CODES).toMatchInlineSnapshot(`
      [
        "INVALID_QUANTITY",
        "MATERIAL_CLASS_REQUIRED",
        "EVIDENCE_MISSING",
        "NANOCHAT_RESTRICTED_DATA_BLOCK",
        "NANOCHAT_NOT_CONFIGURED",
        "BUDGET_EXCEEDED",
        "INVALID_STATE_TRANSITION",
        "TASK_RETRY_EXHAUSTED",
        "RECYCLER_NETWORK_NOT_CONNECTED",
      ]
    `);
    expect(contracts.HONESTY_LABELS).toMatchInlineSnapshot(`
      [
        "NOT_CONFIGURED",
        "NOT_CONNECTED",
        "DEMO",
        "ESTIMATED",
        "INPUT_UNVERIFIED",
      ]
    `);
    expect(contracts.DEVELOPMENT_MODE).toMatchInlineSnapshot(`"DEVELOPMENT_ONLY"`);
  });
});
