import { describe, expect, it } from 'vitest';
import { EarthBus } from '../bus/EarthBus.ts';
import { CompassGate } from '../compass/CompassGate.ts';
import { buildEarthCapabilityTree } from '../swarm/capabilities.ts';
import { HAgent } from './HAgent.ts';
import { SAgent } from './SAgent.ts';
import type { EarthCtx, ProposedAction } from '../types.ts';

const ctx: EarthCtx = {
  actorDid: 'did:earth:operator',
  allowedJurisdictions: ['EU', 'DE', 'DK'],
  now: new Date('2026-09-01T12:00:00Z'),
  hitlApprovals: new Set(),
};

function deps() {
  return {
    bus: new EarthBus(),
    compass: new CompassGate(),
    tree: buildEarthCapabilityTree(),
  };
}

function intakeAction(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: 'act-intake',
    capability: 'ops.intake',
    intent: 'Record inbound pallet',
    actorDid: 'did:earth:operator',
    risk: 'low',
    payload: {
      jurisdiction: 'DE',
      laborFairness: 0.9,
      kgCO2e: 4,
      method: 'measured',
      eudrDeforestationIndex: 0.01,
    },
    ...overrides,
  };
}

describe('S-Agent', () => {
  it('refuses actions outside its capability without executing', async () => {
    let ran = false;
    const agent = new SAgent({
      id: 's-intake',
      capability: 'ops.intake',
      run: async () => {
        ran = true;
        return { ok: true };
      },
    });

    const result = await agent.evaluateAndExecute(
      intakeAction({ capability: 'carbon.post' }),
      ctx,
      deps(),
    );

    expect(result.status).toBe('refused');
    expect(ran).toBe(false);
  });

  it('runs COMPASS before execute and skips the handler when blocked', async () => {
    let ran = false;
    const agent = new SAgent({
      id: 's-intake',
      capability: 'ops.intake',
      run: async () => {
        ran = true;
        return { ok: true };
      },
    });

    const result = await agent.evaluateAndExecute(
      intakeAction({
        payload: {
          jurisdiction: 'DE',
          laborFairness: 0.31,
          kgCO2e: 4,
          method: 'measured',
          eudrDeforestationIndex: 0.01,
        },
      }),
      ctx,
      deps(),
    );

    expect(result.status).toBe('blocked');
    expect(result.verdict?.allow).toBe(false);
    expect(ran).toBe(false);
  });

  it('executes after a passing COMPASS verdict', async () => {
    let ran = false;
    const agent = new SAgent({
      id: 's-intake',
      capability: 'ops.intake',
      run: async () => {
        ran = true;
        return { recorded: true };
      },
    });

    const result = await agent.evaluateAndExecute(intakeAction(), ctx, deps());

    expect(result.status).toBe('executed');
    expect(ran).toBe(true);
    expect(result.output).toEqual({ recorded: true });
  });
});

describe('H-Agent', () => {
  it('dispatches each task to the matching specialist S-Agent', async () => {
    const ran: string[] = [];
    const intake = new SAgent({
      id: 's-intake',
      capability: 'ops.intake',
      run: async () => {
        ran.push('intake');
        return { ok: true };
      },
    });
    const carbon = new SAgent({
      id: 's-carbon',
      capability: 'carbon.post',
      run: async () => {
        ran.push('carbon');
        return { ok: true };
      },
    });
    const harness = new HAgent({ id: 'h-ops', specialists: [intake, carbon] });

    const result = await harness.coordinate(
      {
        id: 'mission-1',
        title: 'Intake then post carbon',
        tasks: [
          intakeAction(),
          intakeAction({
            id: 'act-carbon',
            capability: 'carbon.post',
            intent: 'Post e-liability',
          }),
        ],
      },
      ctx,
      deps(),
    );

    expect(result.results.map((row) => row.agentId)).toEqual(['s-intake', 's-carbon']);
    expect(ran).toEqual(['intake', 'carbon']);
    expect(result.status).toBe('completed');
  });

  it('does not dispatch a task when no specialist owns the capability', async () => {
    const intake = new SAgent({
      id: 's-intake',
      capability: 'ops.intake',
      run: async () => ({ ok: true }),
    });
    const harness = new HAgent({ id: 'h-ops', specialists: [intake] });

    const result = await harness.coordinate(
      {
        id: 'mission-orphan',
        title: 'Unknown capability',
        tasks: [intakeAction({ id: 'act-x', capability: 'identity.anchor' })],
      },
      ctx,
      deps(),
    );

    expect(result.results[0]?.status).toBe('refused');
    expect(result.status).toBe('blocked');
  });
});
