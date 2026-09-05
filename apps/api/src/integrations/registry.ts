import type { TenantContext } from '../auth/types.js';
import { DisabledAdapter } from './core/disabled-adapter.js';
import { IntegrationError } from './core/errors.js';
import { isAutonomousOperationType } from './core/capabilities.js';
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
    this.assertControlledAdapter(adapter);
    this.adapters.set(adapter.providerKey, adapter);
  }

  private assertControlledAdapter(adapter: ProviderAdapter): void {
    if (!INTEGRATION_PROVIDER_KEYS.includes(adapter.providerKey)) {
      throw new IntegrationError(
        'UNKNOWN_PROVIDER',
        `UNKNOWN_PROVIDER: Adapter ${String(adapter.providerKey)} is not a registered control-plane provider.`,
      );
    }
    const capabilities = adapter.capabilities;
    if (!capabilities) {
      throw new IntegrationError(
        'OPERATION_NOT_SUPPORTED',
        `OPERATION_NOT_SUPPORTED: Adapter ${adapter.providerKey} must declare explicit capabilities.`,
      );
    }
    if (Boolean(capabilities.autonomousActions)) {
      throw new IntegrationError(
        'AUTONOMOUS_ACTION_FORBIDDEN',
        `AUTONOMOUS_ACTION_FORBIDDEN: Adapter ${adapter.providerKey} must not declare autonomousActions.`,
      );
    }
    if (Number(capabilities.maxAttempts) !== 1) {
      throw new IntegrationError(
        'RETRY_NOT_PERMITTED',
        `RETRY_NOT_PERMITTED: Adapter ${adapter.providerKey} must set maxAttempts=1 (no automatic retries).`,
      );
    }
    for (const operation of capabilities.allowedOperations) {
      if (isAutonomousOperationType(operation)) {
        throw new IntegrationError(
          'AUTONOMOUS_ACTION_FORBIDDEN',
          `AUTONOMOUS_ACTION_FORBIDDEN: Adapter ${adapter.providerKey} cannot allow ${operation}.`,
        );
      }
    }
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
        this.adapters.set(key, new DisabledAdapter(key));
      }
    }
  }
}

export function createIntegrationRegistry(adapters: Iterable<ProviderAdapter> = []): IntegrationRegistry {
  return new IntegrationRegistry(adapters);
}
