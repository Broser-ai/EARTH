import type { TenantContext } from '../auth/types.js';
import type { IntegrationProviderKey, ProviderAdapter } from './types.js';
import { INTEGRATION_PROVIDER_KEYS, isIntegrationProviderKey } from './types.js';
import { NotConfiguredProviderAdapter, type AdapterHost } from './core/adapter.js';
import { IntegrationError } from './core/errors.js';

export class IntegrationRegistry {
  private readonly adapters: Map<IntegrationProviderKey, ProviderAdapter>;

  constructor(host: AdapterHost) {
    this.adapters = new Map(
      INTEGRATION_PROVIDER_KEYS.map((providerKey) => [
        providerKey,
        new NotConfiguredProviderAdapter(providerKey, host),
      ]),
    );
  }

  get(providerKey: string): ProviderAdapter {
    if (!isIntegrationProviderKey(providerKey)) {
      throw new IntegrationError(404, 'INTEGRATION_PROVIDER_UNKNOWN', 'Unknown integration provider.');
    }
    const adapter = this.adapters.get(providerKey);
    if (!adapter) {
      throw new IntegrationError(404, 'INTEGRATION_PROVIDER_UNKNOWN', 'Unknown integration provider.');
    }
    return adapter;
  }

  list(): ProviderAdapter[] {
    return INTEGRATION_PROVIDER_KEYS.map((key) => this.get(key));
  }

  async statusFor(context: TenantContext, providerKey: IntegrationProviderKey) {
    return this.get(providerKey).getStatus(context);
  }
}
