import type { EarthBus } from '../../bus/EarthBus.ts';
import type { ProposedAction } from '../../types.ts';
import { mapRoboflowPredictions } from './mapDetection.ts';
import type { RoboflowClient } from './client.ts';
import type { VisionInferInput, VisionObservation } from './types.ts';

export class RoboflowVisionAdapter {
  constructor(
    private readonly bus: EarthBus,
    private readonly client: RoboflowClient,
  ) {}

  mode(): RoboflowClient['mode'] {
    return this.client.mode;
  }

  async observe(input: VisionInferInput): Promise<VisionObservation> {
    const predictions = await this.client.infer(input);
    const observation = mapRoboflowPredictions(predictions, input, this.client.mode === 'live');
    this.emitObservation(observation);
    return observation;
  }

  async inferFromAction(action: ProposedAction): Promise<VisionObservation> {
    const imageRef =
      str(action.payload, 'imageUrl') ??
      str(action.payload, 'imageRef') ??
      `action:${action.id}`;
    return this.observe({
      imageRef,
      modelId: str(action.payload, 'modelId'),
      materialHint: str(action.payload, 'materialHint') ?? str(action.payload, 'material'),
    });
  }

  private emitObservation(observation: VisionObservation): void {
    this.bus.emit({
      type: 'vision.detected',
      source: 'vision.roboflow',
      message: observation.live
        ? `PROTOTYPE Roboflow ${observation.detections.length} detections (NOT VERIFIED)`
        : `stub Roboflow ${observation.detections.length} detections (not live)`,
      payload: {
        live: observation.live,
        imageRef: observation.imageRef,
        modelId: observation.modelId,
        classes: observation.detections.map((row) => row.className),
      },
    });

    if (observation.detections.length === 0) return;

    this.bus.emit({
      type: 'intake.observed',
      source: 'vision.roboflow',
      message: `intake observed ${observation.detections[0]?.className ?? 'unknown'}`,
      payload: {
        live: observation.live,
        imageRef: observation.imageRef,
        className: observation.detections[0]?.className,
        confidence: observation.detections[0]?.confidence,
      },
    });
  }
}

function str(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
