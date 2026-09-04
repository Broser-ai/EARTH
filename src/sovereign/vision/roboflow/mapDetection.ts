import type { RoboflowPrediction, VisionInferInput, VisionObservation } from './types.ts';

function bboxOf(pred: RoboflowPrediction): VisionObservation['detections'][number]['bbox'] {
  if (
    pred.x === undefined ||
    pred.y === undefined ||
    pred.width === undefined ||
    pred.height === undefined
  ) {
    return undefined;
  }
  return { x: pred.x, y: pred.y, width: pred.width, height: pred.height };
}

export function mapRoboflowPredictions(
  predictions: RoboflowPrediction[],
  input: VisionInferInput,
  live: boolean,
): VisionObservation {
  return {
    live,
    source: 'roboflow',
    imageRef: input.imageRef,
    modelId: input.modelId ?? null,
    detections: predictions.map((pred) => ({
      className: pred.class,
      confidence: pred.confidence,
      bbox: bboxOf(pred),
    })),
  };
}
