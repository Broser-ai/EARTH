import { describe, expect, it } from 'vitest';
import { createEarthRuntime } from '../runtime/createEarthRuntime.ts';
import { resolvePath } from '../../routing/resolve.ts';

describe('LangGraph Earth swarm', () => {
  it('invokes Prime → H-Agent → COMPASS → S-Agent → ledger and records ticks', async () => {
    const runtime = createEarthRuntime({ rng: () => 0, persistSessionRl: false });
    runtime.boot();

    const outcome = await runtime.runMissionById('mission-cbam');
    const graph = runtime.graphState();

    expect(outcome.status).toBe('completed');
    expect(graph?.node).toBe('inkling');
    expect(graph?.ticks.map((tick) => tick.node)).toEqual(
      expect.arrayContaining(['prime', 'h_agent', 'compass', 's_agent', 'ledger', 'inkling']),
    );
    expect(runtime.bus.history().some((event) => event.type === 'graph.node')).toBe(true);
    expect(runtime.prime.trajectories()[0]?.decision.trainedLabel).toBe('session-rl');
  });

  it('routes vision.infer through the vision graph node', async () => {
    const runtime = createEarthRuntime({ persistSessionRl: false });
    runtime.boot();
    const outcome = await runtime.runMissionById('mission-vision-intake');
    const nodes = runtime.graphState()?.ticks.map((tick) => tick.node) ?? [];
    expect(outcome.status).toBe('completed');
    expect(nodes).toContain('vision');
    expect(runtime.bus.history().some((event) => event.type === 'vision.detected')).toBe(true);
  });

  it('still denies EUDR and ethics missions after Prime selected them', async () => {
    const runtime = createEarthRuntime({ persistSessionRl: false });
    runtime.boot();

    const eudr = await runtime.runMissionById('mission-eudr-block');
    expect(eudr.status).toBe('blocked');
    expect(runtime.graphState()?.verdict?.allow).toBe(false);

    const ethics = await runtime.runMissionById('mission-ethics-block');
    expect(ethics.status).toBe('blocked');
    expect(ethics.blocked).toBeGreaterThan(0);

    const allowed = await runtime.runMissionById('mission-de-alternate');
    expect(allowed.status).toBe('completed');
    expect(runtime.graphState()?.verdict?.allow).toBe(true);
  });

  it('updates session-rl dispatch probabilities after a blocked reward', async () => {
    const runtime = createEarthRuntime({ persistSessionRl: false, rng: () => 0 });
    runtime.boot();
    const before = runtime.policyStats().probabilities['mission-eudr-block'] ?? 0;
    await runtime.runMissionById('mission-eudr-block');
    const after = runtime.policyStats().probabilities['mission-eudr-block'] ?? 0;
    expect(after).toBeLessThan(before);
    expect(runtime.policyStats().trainedLabel).toBe('session-rl');
  });

  it('keeps the /uplink flight path in the command catalog', () => {
    const match = resolvePath('/uplink');
    expect(match.kind).toBe('known');
    if (match.kind === 'known') {
      expect(match.route.pageId).toBe('uplink');
      expect(match.route.callsign).toBe('UPLINK');
    }
  });
});
