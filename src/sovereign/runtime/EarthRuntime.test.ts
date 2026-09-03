import { describe, expect, it } from 'vitest';
import { createEarthRuntime } from './createEarthRuntime.ts';

describe('EarthRuntime', () => {
  it('runs a catalog mission through Prime → H-Agent → S-Agents with COMPASS gating', async () => {
    const runtime = createEarthRuntime({ rng: () => 0, persistSessionRl: false });
    runtime.boot();

    const outcome = await runtime.runNextMission();

    expect(outcome.status).toBe('completed');
    expect(runtime.prime.trajectories()).toHaveLength(1);
    expect(runtime.prime.trajectories()[0]?.decision.trainedLabel).toBe('session-rl');
    expect(runtime.bus.history().some((event) => event.type === 'prime.decision')).toBe(true);
    expect(runtime.bus.history().some((event) => event.type === 'prime.trajectory.recorded')).toBe(true);
    expect(runtime.bus.history().some((event) => event.type === 'graph.node')).toBe(true);
  });

  it('blocks the ethics catalog mission and still records a trajectory', async () => {
    const runtime = createEarthRuntime();
    runtime.boot();

    const blocked = await runtime.runMissionById('mission-ethics-block');

    expect(blocked.status).toBe('blocked');
    expect(blocked.blocked).toBeGreaterThan(0);
    expect(runtime.prime.trajectories()[0]?.reward).toBeLessThan(0);
  });
});
