import type { TenantContext } from '../../auth/types.js';
import {
  type IntegrationOperation,
  type IntegrationPolicyDecision,
  type IntegrationProviderKey,
  type IntegrationRequest,
  type IntegrationSystemContext,
  type ProviderAdapter,
  type ProviderHealthResult,
} from '../types.js';
import type { AdapterCapabilities } from './capabilities.js';
import { defaultAdapterCapabilities } from './capabilities.js';
import { IntegrationError } from './errors.js';

export class DisabledAdapter implements ProviderAdapter {
  constructor(readonly providerKey: IntegrationProviderKey) {}

  get capabilities(): AdapterCapabilities {
    return defaultAdapterCapabilities(this.providerKey);
  }

  async getStatus(_context: TenantContext): Promise<ProviderHealthResult> {
    return notConfigured(this.providerKey);
  }

  async checkHealth(_systemContext: IntegrationSystemContext): Promise<ProviderHealthResult> {
    return notConfigured(this.providerKey);
  }

  async validateRequest(
    _context: TenantContext,
    _request: IntegrationRequest,
  ): Promise<IntegrationPolicyDecision> {
    return {
      allowed: false,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message: 'provider adapter is disabled by default; no external call was made',
      resultingState: 'NOT_CONFIGURED',
      providerStatus: 'NOT_CONFIGURED',
    };
  }

  async createOperation(
    _context: TenantContext,
    _request: IntegrationRequest,
  ): Promise<IntegrationOperation> {
    throw new IntegrationError(
      'PROVIDER_NOT_CONFIGURED',
      'disabled adapters cannot create provider-side jobs',
      400,
    );
  }

  async executeOperation(
    _systemContext: IntegrationSystemContext,
    operation: IntegrationOperation,
  ): Promise<IntegrationOperation> {
    return {
      ...operation,
      state: 'NOT_CONFIGURED',
      errorCode: 'PROVIDER_NOT_CONFIGURED',
      safeSummary: 'Provider is not configured. No external call was made.',
      completedAt: new Date().toISOString(),
    };
  }

  async cancelOperation(
    _context: TenantContext,
    _operationId: string,
  ): Promise<IntegrationOperation> {
    throw new IntegrationError(
      'PROVIDER_NOT_CONFIGURED',
      'disabled adapters have no remote job to cancel',
      400,
    );
  }
}

function notConfigured(providerKey: IntegrationProviderKey): ProviderHealthResult {
  return {
    providerKey,
    status: 'NOT_CONFIGURED',
    configured: false,
    enabled: false,
    healthy: false,
    connected: false,
    reasonCode: 'PROVIDER_NOT_CONFIGURED',
    checkedAt: new Date().toISOString(),
  };
}
