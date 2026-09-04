import { describe, expect, it } from 'vitest';
import { CompassGate } from './CompassGate.ts';
import type { EarthCtx, ProposedAction } from '../types.ts';

const ctx: EarthCtx = {
  actorDid: 'did:earth:operator',
  allowedJurisdictions: ['EU', 'DE', 'DK'],
  now: new Date('2026-09-01T12:00:00Z'),
  hitlApprovals: new Set(),
};

function action(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: 'act-clean',
    capability: 'ops.intake',
    intent: 'Record inbound material batch',
    actorDid: 'did:earth:operator',
    risk: 'low',
    payload: {
      jurisdiction: 'DE',
      laborFairness: 0.82,
      kgCO2e: 12,
      method: 'measured',
      eudrDeforestationIndex: 0.01,
    },
    ...overrides,
  };
}

describe('COMPASS evaluate-before-execute', () => {
  const gate = new CompassGate();

  it('allows a clean low-risk action with all four pillar scores at or above floor', async () => {
    const verdict = await gate.evaluate(action(), ctx);

    expect(verdict.allow).toBe(true);
    expect(verdict.opinions.sovereignty.score).toBeGreaterThanOrEqual(verdict.opinions.sovereignty.floor);
    expect(verdict.opinions.eco.score).toBeGreaterThanOrEqual(verdict.opinions.eco.floor);
    expect(verdict.opinions.compliance.score).toBeGreaterThanOrEqual(verdict.opinions.compliance.floor);
    expect(verdict.opinions.ethics.score).toBeGreaterThanOrEqual(verdict.opinions.ethics.floor);
    expect(verdict.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('blocks when ethics labor fairness is below the 0.40 floor', async () => {
    const verdict = await gate.evaluate(
      action({
        id: 'act-ethics',
        payload: {
          jurisdiction: 'DE',
          laborFairness: 0.31,
          kgCO2e: 12,
          method: 'measured',
          eudrDeforestationIndex: 0.01,
        },
      }),
      ctx,
    );

    expect(verdict.allow).toBe(false);
    expect(verdict.opinions.ethics.score).toBeLessThan(0.4);
    expect(verdict.conflicts.length).toBeGreaterThan(0);
  });

  it('blocks EUDR deforestation above 0.05 via the compliance pillar', async () => {
    const verdict = await gate.evaluate(
      action({
        id: 'act-eudr',
        payload: {
          jurisdiction: 'BR',
          laborFairness: 0.7,
          kgCO2e: 40,
          method: 'calculated',
          eudrDeforestationIndex: 0.082,
        },
      }),
      ctx,
    );

    expect(verdict.allow).toBe(false);
    expect(verdict.opinions.compliance.score).toBeLessThan(verdict.opinions.compliance.floor);
  });

  it('requires HITL for critical-risk actions even when scores clear floors', async () => {
    const verdict = await gate.evaluate(action({ id: 'act-crit', risk: 'critical' }), ctx);

    expect(verdict.allow).toBe(true);
    expect(verdict.requiresHitl).toBe(true);
  });
});
