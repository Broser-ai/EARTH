import type { ProviderAdapter } from '../types.js';
import { HuggingFaceAdapter, type HuggingFaceAdapterOptions } from './adapter.js';

export type { HuggingFaceAdapterOptions };
export type { HuggingFaceTransport, HuggingFaceTransportInit } from './transport.js';

export function createAdapter(options?: HuggingFaceAdapterOptions): ProviderAdapter {
  return new HuggingFaceAdapter(options);
}
