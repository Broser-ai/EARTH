export type RoboflowClientMode = 'stub' | 'live';

export interface RoboflowProject {
  id: string;
  name: string;
  type: string;
  images: number;
}

export interface RoboflowPrediction {
  class: string;
  confidence: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface VisionInferInput {
  imageRef: string;
  modelId?: string;
  materialHint?: string;
  confidence?: number;
}

export interface VisionBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionDetection {
  className: string;
  confidence: number;
  bbox?: VisionBBox;
}

export interface VisionObservation {
  live: boolean;
  source: 'roboflow';
  imageRef: string;
  modelId: string | null;
  detections: VisionDetection[];
}
