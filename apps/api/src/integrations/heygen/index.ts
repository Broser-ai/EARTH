import type { ProviderAdapter } from '../types.js';
import { HeyGenAdapter, type HeyGenAdapterOptions } from './adapter.js';

export type { HeyGenAdapterOptions };
export type { HeyGenTransport } from './transport.js';
export { HEYGEN_DRAFT_REQUEST_URL, HEYGEN_HEALTH_URL } from './transport.js';

export function createAdapter(options: HeyGenAdapterOptions = {}): ProviderAdapter {
  return new HeyGenAdapter(options);
}
