import type {
  RoboflowClientMode,
  RoboflowPrediction,
  RoboflowProject,
  VisionInferInput,
} from './types.ts';

export interface RoboflowClient {
  readonly mode: RoboflowClientMode;
  listProjects(): Promise<RoboflowProject[]>;
  infer(input: VisionInferInput): Promise<RoboflowPrediction[]>;
}

/**
 * Deterministic stub. Live HTTP/MCP client attaches when credentials exist
 * (see HttpRoboflowClient). Do not treat these predictions as live inference.
 */
export class StubRoboflowClient implements RoboflowClient {
  readonly mode = 'stub' as const;

  async listProjects(): Promise<RoboflowProject[]> {
    return [];
  }

  async infer(input: VisionInferInput): Promise<RoboflowPrediction[]> {
    const className = input.materialHint ?? 'unknown';
    return [
      {
        class: className,
        confidence: 0.42,
        x: 0.5,
        y: 0.5,
        width: 0.25,
        height: 0.25,
      },
    ];
  }
}

/**
 * Read-only HTTP attach point for a sovereign backend / test injection.
 * The browser SPA must not bundle API keys; construct this only where secrets stay server-side.
 */
export class HttpRoboflowClient implements RoboflowClient {
  readonly mode = 'live' as const;

  constructor(private readonly options: { apiKey: string; baseUrl?: string }) {}

  async listProjects(): Promise<RoboflowProject[]> {
    const base = this.options.baseUrl ?? 'https://api.roboflow.com';
    const url = new URL(base);
    url.searchParams.set('api_key', this.options.apiKey);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Roboflow listProjects HTTP ${response.status}`);
    }
    const body = (await response.json()) as {
      workspace?: { projects?: Array<{ id: string; name: string; type?: string; images?: number }> };
    };
    return (body.workspace?.projects ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      type: project.type ?? 'unknown',
      images: project.images ?? 0,
    }));
  }

  async infer(input: VisionInferInput): Promise<RoboflowPrediction[]> {
    const modelId = input.modelId;
    if (!modelId) {
      throw new Error('HttpRoboflowClient.infer requires modelId — workspace snapshot had 0 trained models');
    }
    const base = this.options.baseUrl ?? 'https://detect.roboflow.com';
    const url = new URL(`${base.replace(/\/$/, '')}/${modelId}`);
    url.searchParams.set('api_key', this.options.apiKey);
    if (input.confidence !== undefined) {
      url.searchParams.set('confidence', String(input.confidence));
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: input.imageRef }),
    });
    if (!response.ok) {
      throw new Error(`Roboflow infer HTTP ${response.status}`);
    }
    const body = (await response.json()) as { predictions?: RoboflowPrediction[] };
    return body.predictions ?? [];
  }
}
