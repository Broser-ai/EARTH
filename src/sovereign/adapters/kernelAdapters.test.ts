import { describe, expect, it } from 'vitest';
import { createEarthRuntime } from '../runtime/createEarthRuntime.ts';
import { InklingPolicy } from '../prime/inkling/InklingPolicy.ts';
import { CredentialedTinkerClient } from '../prime/tinker/client.ts';
import { SAgent } from '../agents/SAgent.ts';
import { EarthBus } from '../bus/EarthBus.ts';
import { CompassGate } from '../compass/CompassGate.ts';
import { buildEarthCapabilityTree } from '../swarm/capabilities.ts';
import type { EarthCtx, ProposedAction } from '../types.ts';

const ctx: EarthCtx = {
  actorDid: 'did:earth:operator',
  allowedJurisdictions: ['EU', 'DE', 'DK'],
  now: new Date('2026-09-01T12:00:00Z'),
  hitlApprovals: new Set(),
};

describe('kernel adapters in the Prime → H → S → COMPASS equation', () => {
  it('reports Roboflow stub, Inkling untrained, Tinker stub with trained=false', () => {
    const runtime = createEarthRuntime();
    const status = Object.fromEntries(runtime.adapterStatus().map((row) => [row.id, row]));

    expect(status.roboflow?.link).toBe('stub');
    expect(status.inkling?.link).toBe('untrained');
    expect(status.inkling?.trained).toBe(false);
    expect(status.tinker?.link).toBe('stub');
    expect(runtime.inkling.trained()).toBe(false);
  });

  it('does not report a credentialed but unchecked Tinker intent as connected', async () => {
    const runtime = createEarthRuntime({ tinkerClient: new CredentialedTinkerClient() });

    expect(runtime.adapterStatus().find((row) => row.id === 'tinker')?.link).toBe('stub');
    const job = await runtime.tinker.submit([]);

    expect(job.status).toBe('queued');
    expect(runtime.adapterStatus().find((row) => row.id === 'tinker')?.link).toBe('stub');
  });

  it('runs vision.infer through the swarm and still records an Inkling-hooked trajectory', async () => {
    const runtime = createEarthRuntime();
    runtime.boot();

    const outcome = await runtime.runMissionById('mission-vision-intake');

    expect(outcome.status).toBe('completed');
    expect(runtime.bus.history().some((event) => event.type === 'vision.detected')).toBe(true);
    expect(runtime.bus.history().some((event) => event.type === 'intake.observed')).toBe(true);
    expect(runtime.bus.history().some((event) => event.type === 'inkling.lesson.attached')).toBe(true);
    expect(runtime.inkling.hookedEpisodes()[0]?.lessonId).toBe('lesson-prime-mission-select');
    expect(runtime.prime.trajectories()[0]?.decision.trained).toBe(true);
    expect(runtime.prime.trajectories()[0]?.decision.trainedLabel).toBe('session-rl');
  });

  it('lets COMPASS block a mission even when a trained Inkling policy selected it', async () => {
    const policy = new InklingPolicy();
    policy.attachWeights({
      uri: 'fixture://inkling',
      preferredMissionId: 'mission-ethics-block',
      liveInference: false,
    });
    const runtime = createEarthRuntime({ policy });
    runtime.boot();

    const outcome = await runtime.runNextMission();

    expect(runtime.prime.trajectories()[0]?.decision.trained).toBe(true);
    expect(runtime.prime.trajectories()[0]?.decision.missionId).toBe('mission-ethics-block');
    expect(outcome.status).toBe('blocked');
    expect(outcome.blocked).toBeGreaterThan(0);
    expect(outcome.executed).toBe(0);
  });

  it('blocks a disallowed vision.infer action before the adapter runs', async () => {
    let ran = false;
    const agent = new SAgent({
      id: 's-vision-infer',
      capability: 'vision.infer',
      run: async () => {
        ran = true;
        return { ok: true };
      },
    });
    const action: ProposedAction = {
      id: 'act-vision-bad',
      capability: 'vision.infer',
      intent: 'Infer material from banned-jurisdiction intake',
      actorDid: 'did:earth:operator',
      risk: 'low',
      payload: {
        jurisdiction: 'DE',
        laborFairness: 0.2,
        kgCO2e: 4,
        method: 'measured',
        eudrDeforestationIndex: 0.01,
        imageUrl: 'https://earth.local/x.jpg',
      },
    };

    const result = await agent.evaluateAndExecute(action, ctx, {
      bus: new EarthBus(),
      compass: new CompassGate(),
      tree: buildEarthCapabilityTree(),
    });

    expect(result.status).toBe('blocked');
    expect(ran).toBe(false);
  });
});
