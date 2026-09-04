import { describe, expect, it } from 'vitest';
import { EarthBus } from '../bus/EarthBus.ts';
import { CompassGate } from '../compass/CompassGate.ts';
import { createDefaultSwarm } from './createDefaultSwarm.ts';
import type { EarthCtx, ProposedAction } from '../types.ts';

const ctx: EarthCtx = {
  actorDid: 'did:earth:operator',
  allowedJurisdictions: ['EU', 'DE', 'DK'],
  now: new Date('2026-09-01T12:00:00Z'),
  hitlApprovals: new Set(),
};

function clean(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: 'act-1',
    capability: 'ops.intake',
    intent: 'Intake',
    actorDid: 'did:earth:operator',
    risk: 'low',
    payload: {
      jurisdiction: 'DE',
      laborFairness: 0.88,
      kgCO2e: 8,
      method: 'measured',
      eudrDeforestationIndex: 0.01,
    },
    ...overrides,
  };
}

describe('SwarmCoordinator', () => {
  it('runs a hierarchical mission through H-Agent specialists and emits bus events', async () => {
    const bus = new EarthBus();
    const swarm = createDefaultSwarm({ bus, compass: new CompassGate() });

    const outcome = await swarm.run(
      {
        id: 'swarm-intake',
        title: 'Record intake',
        tasks: [clean()],
      },
      ctx,
    );

    expect(outcome.status).toBe('completed');
    expect(outcome.executed).toBe(1);
    expect(outcome.blocked).toBe(0);
    expect(bus.history().some((event) => event.type === 'swarm.mission.started')).toBe(true);
    expect(bus.history().some((event) => event.type === 'swarm.mission.completed')).toBe(true);
    expect(bus.history().some((event) => event.type === 'compass.verdict')).toBe(true);
  });

  it('does not count a COMPASS-blocked task as executed', async () => {
    const swarm = createDefaultSwarm({ bus: new EarthBus(), compass: new CompassGate() });

    const outcome = await swarm.run(
      {
        id: 'swarm-block',
        title: 'Unethical supplier',
        tasks: [
          clean({
            id: 'act-bad',
            payload: {
              jurisdiction: 'DE',
              laborFairness: 0.31,
              kgCO2e: 8,
              method: 'measured',
              eudrDeforestationIndex: 0.01,
            },
          }),
        ],
      },
      ctx,
    );

    expect(outcome.status).toBe('blocked');
    expect(outcome.executed).toBe(0);
    expect(outcome.blocked).toBe(1);
  });

  it('deny-by-default rejects capabilities missing from the tree', () => {
    const swarm = createDefaultSwarm({ bus: new EarthBus(), compass: new CompassGate() });
    expect(swarm.tree.can('ops.intake')).toBe(true);
    expect(swarm.tree.can('tool.dump.512')).toBe(false);
  });
});
