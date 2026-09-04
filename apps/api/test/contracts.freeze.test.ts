import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ACTOR_TYPES,
  DATA_CLASSIFICATIONS,
  DEVELOPMENT_MODE,
  HONESTY_LABELS,
  NEXT_ACTIONS,
  POLICY_VERSION,
  REASON_CODES,
  REQUIRED_PROMPT_STRINGS,
  SESSION_STATES,
  TASK_STATES,
  TASK_TYPES,
  TERMINAL_SESSION_STATES,
  USER_ROLES,
  WORKFLOW_TYPE,
  WORKFLOW_VERSION,
  isTerminalSessionState,
} from '../src/contracts.js';
import * as primeTypes from '../src/prime/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const spec = readFileSync(resolve(here, '../../../docs/SHARED_CONTRACTS.md'), 'utf8');

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

describe('API contracts freeze', () => {
  it('matches docs/SHARED_CONTRACTS.md exactly', () => {
    expect(DEVELOPMENT_MODE).toBe('DEVELOPMENT_ONLY');
    expect(WORKFLOW_TYPE).toBe('MATERIAL_OPPORTUNITY_INTAKE');
    expect(WORKFLOW_VERSION).toBe('0.1');
    expect(POLICY_VERSION).toBe('prime-v0.1');
    expect([...SESSION_STATES]).toEqual(extractTsUnion(spec, 'SessionState'));
    expect([...TASK_TYPES]).toEqual(extractTsUnion(spec, 'TaskType'));
    expect([...TASK_STATES]).toEqual(extractTsUnion(spec, 'TaskState'));
    expect([...REASON_CODES]).toEqual(extractTsUnion(spec, 'ReasonCode'));
    expect([...USER_ROLES]).toEqual(extractTsUnion(spec, 'UserRole'));
    expect([...DATA_CLASSIFICATIONS]).toEqual(extractTsUnion(spec, 'DataClassification'));
    expect([...ACTOR_TYPES]).toEqual(extractTsUnion(spec, 'ActorType'));
    expect([...NEXT_ACTIONS]).toEqual(extractTsUnion(spec, 'NextRecommendedAction'));
    expect([...HONESTY_LABELS]).toEqual(extractHonestyLabels(spec));
  });

  it('freezes prompt-required strings', () => {
    expect([...REQUIRED_PROMPT_STRINGS]).toEqual([
      'DEVELOPMENT_ONLY',
      'INPUT_UNVERIFIED',
      'NOT_CONFIGURED',
      'NOT_CONNECTED',
      'EVIDENCE_MISSING',
      'RECYCLER_NETWORK_NOT_CONNECTED',
    ]);
    expect(DEVELOPMENT_MODE).toBe('DEVELOPMENT_ONLY');
    expect(HONESTY_LABELS).toContain('INPUT_UNVERIFIED');
    expect(HONESTY_LABELS).toContain('NOT_CONNECTED');
    expect(TASK_STATES).toContain('NOT_CONFIGURED');
    expect(REASON_CODES).toContain('EVIDENCE_MISSING');
    expect(REASON_CODES).toContain('RECYCLER_NETWORK_NOT_CONNECTED');
  });

  it('re-exports the same frozen arrays from prime/types', () => {
    expect(primeTypes.SESSION_STATES).toEqual(SESSION_STATES);
    expect(primeTypes.TASK_TYPES).toEqual(TASK_TYPES);
    expect(primeTypes.TASK_STATES).toEqual(TASK_STATES);
    expect(primeTypes.REASON_CODES).toEqual(REASON_CODES);
    expect(primeTypes.WORKFLOW_TYPE).toBe(WORKFLOW_TYPE);
    expect(primeTypes.POLICY_VERSION).toBe(POLICY_VERSION);
  });

  it('treats COMPLETED FAILED CANCELLED BUDGET_STOPPED EXPIRED as terminal', () => {
    expect([...TERMINAL_SESSION_STATES]).toEqual([
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'BUDGET_STOPPED',
      'EXPIRED',
    ]);
    expect(isTerminalSessionState('RUNNING')).toBe(false);
    expect(isTerminalSessionState('COMPLETED')).toBe(true);
    expect(isTerminalSessionState('BUDGET_STOPPED')).toBe(true);
  });
});
