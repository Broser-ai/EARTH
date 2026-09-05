import { describe, expect, it } from 'vitest';
import { NotConfiguredProviderAdapter } from '../../../src/integrations/core/adapter.js';
import { IntegrationError } from '../../../src/integrations/core/errors.js';
import { PROVIDER_OPERATION_TYPES } from '../../../src/integrations/core/capabilities.js';
import { createIntegrationRegistry } from '../../../src/integrations/registry.js';
import type { ProviderAdapter } from '../../../src/integrations/types.js';

const unusedHost = {
  validateRequest: async () => {
    throw new Error('unused');
  },
  createOperation: async () => {
    throw new Error('unused');
  },
  cancelOperation: async () => {
    throw new Error('unused');
  },
};

function fakeAdapter(overrides: Partial<ProviderAdapter> = {}): ProviderAdapter {
  const base = new NotConfiguredProviderAdapter('ROBOFLOW', unusedHost);
  return {
    ...base,
    providerKey: 'ROBOFLOW',
    capabilities: {
      allowedOperations: [...PROVIDER_OPERATION_TYPES.ROBOFLOW],
      externalDataTransfer: false,
      autonomousActions: false,
      maxTimeoutMs: 10_000,
      maxAttempts: 1,
    },
    ...overrides,
  };
}

describe('IntegrationRegistry controlled registration', () => {
  it('exposes explicit capabilities on the default not-configured adapter', () => {
    const registry = createIntegrationRegistry(unusedHost);
    const adapter = registry.get('ROBOFLOW');
    expect(adapter.capabilities.autonomousActions).toBe(false);
    expect(adapter.capabilities.maxAttempts).toBe(1);
    expect(adapter.capabilities.allowedOperations).toContain('VISION_INSPECT');
    expect(adapter.capabilities.maxTimeoutMs).toBeLessThanOrEqual(30_000);
  });

  it('refuses to register an adapter for an unknown provider key', () => {
    const registry = createIntegrationRegistry(unusedHost);
    expect(() =>
      registry.register(
        fakeAdapter({
          providerKey: 'OPENAI' as unknown as ProviderAdapter['providerKey'],
        }),
      ),
    ).toThrow(IntegrationError);
    expect(() =>
      registry.register(
        fakeAdapter({
          providerKey: 'OPENAI' as unknown as ProviderAdapter['providerKey'],
        }),
      ),
    ).toThrow(/UNKNOWN_PROVIDER/);
  });

  it('refuses adapters that claim autonomous or booking operations', () => {
    const registry = createIntegrationRegistry(unusedHost);
    expect(() =>
      registry.register(
        fakeAdapter({
          capabilities: {
            allowedOperations: ['VISION_INSPECT', 'BOOKING_SLOT'],
            externalDataTransfer: false,
            autonomousActions: false,
            maxTimeoutMs: 10_000,
            maxAttempts: 1,
          },
        }),
      ),
    ).toThrow(/AUTONOMOUS_ACTION_FORBIDDEN/);

    expect(() =>
      registry.register(
        fakeAdapter({
          capabilities: {
            allowedOperations: ['VISION_INSPECT'],
            externalDataTransfer: false,
            autonomousActions: true as unknown as false,
            maxTimeoutMs: 10_000,
            maxAttempts: 1,
          },
        }),
      ),
    ).toThrow(/AUTONOMOUS_ACTION_FORBIDDEN/);
  });

  it('refuses retry loops above one attempt', () => {
    const registry = createIntegrationRegistry(unusedHost);
    expect(() =>
      registry.register(
        fakeAdapter({
          capabilities: {
            allowedOperations: ['VISION_INSPECT'],
            externalDataTransfer: false,
            autonomousActions: false,
            maxTimeoutMs: 10_000,
            maxAttempts: 3 as unknown as 1,
          },
        }),
      ),
    ).toThrow(/RETRY_NOT_PERMITTED/);
  });
});
