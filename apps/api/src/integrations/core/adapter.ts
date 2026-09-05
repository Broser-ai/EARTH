import type { TenantContext } from '../../auth/types.js';
import type {
  AdapterCapabilities,
  IntegrationOperation,
  IntegrationPolicyDecision,
  IntegrationProviderKey,
  IntegrationProviderStatus,
  IntegrationRequest,
  ProviderAdapter,
} from '../types.js';
import { defaultAdapterCapabilities } from './capabilities.js';
import { IntegrationNotImplementedError } from './errors.js';

export type AdapterHost = {
  validateRequest(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationPolicyDecision>;
  createOperation(context: TenantContext, request: IntegrationRequest): Promise<IntegrationOperation>;
  cancelOperation(context: TenantContext, operationId: string): Promise<IntegrationOperation>;
};

/**
 * v0.1 adapter: every provider is NOT_CONFIGURED.
 * Config/env presence is ignored. executeOperation never performs HTTP.
 */
export class NotConfiguredProviderAdapter implements ProviderAdapter {
  constructor(
    readonly providerKey: IntegrationProviderKey,
    private readonly host: AdapterHost,
  ) {}

  get capabilities(): AdapterCapabilities {
    return defaultAdapterCapabilities(this.providerKey);
  }

  async getStatus(_context: TenantContext): Promise<IntegrationProviderStatus> {
    void _context;
    return 'NOT_CONFIGURED';
  }

  async validateRequest(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationPolicyDecision> {
    return this.host.validateRequest(context, request);
  }

  async createOperation(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationOperation> {
    return this.host.createOperation(context, request);
  }

  async executeOperation(): Promise<never> {
    throw new IntegrationNotImplementedError(
      'executeOperation is not implemented in Integration Control Plane v0.1. Providers are NOT_CONFIGURED. No outbound HTTP is performed.',
    );
  }

  async cancelOperation(
    context: TenantContext,
    operationId: string,
  ): Promise<IntegrationOperation> {
    return this.host.cancelOperation(context, operationId);
  }
}
