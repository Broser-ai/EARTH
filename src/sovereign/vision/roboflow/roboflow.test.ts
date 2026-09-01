import { describe, expect, it } from 'vitest';
import { EarthBus } from '../../bus/EarthBus.ts';
import { mapRoboflowPredictions } from './mapDetection.ts';
import { StubRoboflowClient, type RoboflowClient } from './client.ts';
import { RoboflowVisionAdapter } from './RoboflowVisionAdapter.ts';
import type { RoboflowPrediction, VisionInferInput } from './types.ts';

class MockRoboflowClient implements RoboflowClient {
  readonly mode = 'stub' as const;

  async listProjects() {
    return [];
  }

  async infer(_input: VisionInferInput): Promise<RoboflowPrediction[]> {
    return [{ class: 'rPET', confidence: 0.91, x: 12, y: 8, width: 40, height: 22 }];
  }
}

describe('Roboflow vision adapter', () => {
  it('maps a Roboflow detection onto a typed vision observation', () => {
    const observation = mapRoboflowPredictions(
      [{ class: 'HDPE', confidence: 0.88, x: 1, y: 2, width: 3, height: 4 }],
      { imageRef: 'intake://pallet-1' },
      false,
    );

    expect(observation.live).toBe(false);
    expect(observation.source).toBe('roboflow');
    expect(observation.detections).toEqual([
      { className: 'HDPE', confidence: 0.88, bbox: { x: 1, y: 2, width: 3, height: 4 } },
    ]);
  });

  it('emits vision.detected and intake.observed on EarthBus', async () => {
    const bus = new EarthBus();
    const adapter = new RoboflowVisionAdapter(bus, new MockRoboflowClient());

    const observation = await adapter.observe({ imageRef: 'https://earth.local/intake.jpg' });

    expect(observation.detections[0]?.className).toBe('rPET');
    expect(bus.history().some((event) => event.type === 'vision.detected')).toBe(true);
    expect(bus.history().some((event) => event.type === 'intake.observed')).toBe(true);
    expect(bus.history().find((event) => event.type === 'vision.detected')?.payload.live).toBe(false);
  });

  it('does not pretend the default client is live inference', async () => {
    const adapter = new RoboflowVisionAdapter(new EarthBus(), new StubRoboflowClient());
    expect(adapter.mode()).toBe('stub');
    const observation = await adapter.observe({ imageRef: 'stub', materialHint: 'PP' });
    expect(observation.live).toBe(false);
    expect(observation.detections[0]?.className).toBe('PP');
  });
});
