import type { TenantContext } from '../auth/types.js';
import { DisabledAdapter } from './core/disabled-adapter.js';
import {
  INTEGRATION_PROVIDER_KEYS,
  type IntegrationProviderKey,
  type ProviderAdapter,
} from './types.js';

export class IntegrationRegistry {
  private readonly adapters = new Map<IntegrationProviderKey, ProviderAdapter>();

  constructor(adapters: Iterable<ProviderAdapter> = []) {
    for (const adapter of adapters) {
      this.register(adapter);
    }
    for (const key of INTEGRATION_PROVIDER_KEYS) {
      if (!this.adapters.has(key)) {
        this.adapters.set(key, new DisabledAdapter(key));
      }
    }
  }

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.providerKey, adapter);
  }

  get(providerKey: IntegrationProviderKey): ProviderAdapter {
    return this.adapters.get(providerKey) ?? new DisabledAdapter(providerKey);
  }

  list(): ProviderAdapter[] {
    return INTEGRATION_PROVIDER_KEYS.map((key) => this.get(key));
  }

  async loadOptionalAdapters(): Promise<void> {
    const folders: Record<IntegrationProviderKey, string> = {
      ROBOFLOW: 'roboflow',
      HUGGINGFACE: 'huggingface',
      TINKER: 'tinker',
      INKLING: 'inkling',
      HEYGEN: 'heygen',
      LANGGRAPH: 'langgraph',
    };

    for (const key of INTEGRATION_PROVIDER_KEYS) {
      const url = new URL(`./${folders[key]}/index.js`, import.meta.url).href;
      try {
        const mod = (await import(url)) as { createAdapter?: () => ProviderAdapter };
        if (typeof mod.createAdapter === 'function') {
          const adapter = mod.createAdapter();
          if (adapter.providerKey === key) {
            this.register(adapter);
            continue;
          }
        }
      } catch {
        this.register(new DisabledAdapter(key));
      }
    }
  }
}

export function createIntegrationRegistry(adapters: Iterable<ProviderAdapter> = []): IntegrationRegistry {
  return new IntegrationRegistry(adapters);
}
