export const HUGGINGFACE_HUB_ORIGIN = 'https://huggingface.co';
export const HUGGINGFACE_HUB_API_PREFIX = `${HUGGINGFACE_HUB_ORIGIN}/api/models`;

export interface HuggingFaceTransportInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface HuggingFaceTransportResponse {
  status: number;
  json(): Promise<unknown>;
}

/**
 * Injected HTTP boundary. The default adapter transport is null — no network.
 * Production v0.1 never installs a real fetch implementation.
 */
export interface HuggingFaceTransport {
  request(url: string, init: HuggingFaceTransportInit): Promise<HuggingFaceTransportResponse>;
}

export function huggingFaceHealthUrl(): string {
  return HUGGINGFACE_HUB_API_PREFIX;
}

export function huggingFaceHubModelApiUrl(modelId: string): string {
  return `${HUGGINGFACE_HUB_API_PREFIX}/${modelId}`;
}

export function isHuggingFaceHubApiUrl(url: string): boolean {
  return url === HUGGINGFACE_HUB_API_PREFIX || url.startsWith(`${HUGGINGFACE_HUB_API_PREFIX}/`);
}
