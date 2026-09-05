import type { TenantContext } from '../auth/types.js';
import type { IntegrationProviderKey, ProviderAdapter } from './types.js';
import { INTEGRATION_PROVIDER_KEYS, isIntegrationProviderKey } from './types.js';
import { NotConfiguredProviderAdapter, type AdapterHost } from './core/adapter.js';
import { isAutonomousOperationType } from './core/capabilities.js';
import { IntegrationError } from './core/errors.js';

export class IntegrationRegistry {
  private readonly adapters: Map<IntegrationProviderKey, ProviderAdapter>;
  private readonly host: AdapterHost;

  constructor(host: AdapterHost, adapters: Iterable<ProviderAdapter> = []) {
    this.host = host;
    this.adapters = new Map(
      INTEGRATION_PROVIDER_KEYS.map((providerKey) => [
        providerKey,
        new NotConfiguredProviderAdapter(providerKey, host),
      ]),
    );
    for (const adapter of adapters) {
      this.register(adapter);
    }
  }

  register(adapter: ProviderAdapter): void {
    this.assertControlledAdapter(adapter);
    this.adapters.set(adapter.providerKey, adapter);
  }

  private assertControlledAdapter(adapter: ProviderAdapter): void {
    if (!isIntegrationProviderKey(adapter.providerKey)) {
      throw new IntegrationError(
        400,
        'INTEGRATION_PROVIDER_UNKNOWN',
        `UNKNOWN_PROVIDER: Adapter ${String(adapter.providerKey)} is not a registered control-plane provider.`,
      );
    }
    const capabilities = adapter.capabilities;
    if (!capabilities) {
      throw new IntegrationError(
        400,
        'INTEGRATION_OPERATION_NOT_SUPPORTED',
        `OPERATION_NOT_SUPPORTED: Adapter ${adapter.providerKey} must declare explicit capabilities.`,
      );
    }
    if (Boolean(capabilities.autonomousActions)) {
      throw new IntegrationError(
        400,
        'INTEGRATION_AUTONOMOUS_ACTION_FORBIDDEN',
        `AUTONOMOUS_ACTION_FORBIDDEN: Adapter ${adapter.providerKey} must not declare autonomousActions.`,
      );
    }
    if (Number(capabilities.maxAttempts) !== 1) {
      throw new IntegrationError(
        400,
        'INTEGRATION_RETRY_NOT_PERMITTED',
        `RETRY_NOT_PERMITTED: Adapter ${adapter.providerKey} must set maxAttempts=1 (no automatic retries).`,
      );
    }
    for (const operation of capabilities.allowedOperations) {
      if (isAutonomousOperationType(operation)) {
        throw new IntegrationError(
          400,
          'INTEGRATION_AUTONOMOUS_ACTION_FORBIDDEN',
          `AUTONOMOUS_ACTION_FORBIDDEN: Adapter ${adapter.providerKey} cannot allow ${operation}.`,
        );
      }
    }
  }

  get(providerKey: string): ProviderAdapter {
    if (!isIntegrationProviderKey(providerKey)) {
      throw new IntegrationError(404, 'INTEGRATION_PROVIDER_UNKNOWN', 'Unknown integration provider.');
    }
    const adapter = this.adapters.get(providerKey);
    if (!adapter) {
      return new NotConfiguredProviderAdapter(providerKey, this.host);
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

export function createIntegrationRegistry(
  host: AdapterHost,
  adapters: Iterable<ProviderAdapter> = [],
): IntegrationRegistry {
  return new IntegrationRegistry(host, adapters);
}
