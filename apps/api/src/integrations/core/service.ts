import type { Pool, PoolClient } from 'pg';
import type { TenantContext } from '../../auth/types.js';
import { insertIntegrationAuditEvent, requestDigestFor } from '../audit.js';
import { probeProviderConfig } from '../config.js';
import { evaluateIntegrationPolicy } from '../policy.js';
import { IntegrationRegistry } from '../registry.js';
import type {
  IntegrationAuditEventType,
  IntegrationOperation,
  IntegrationPolicyDecision,
  IntegrationProviderKey,
  IntegrationProviderRecord,
  IntegrationRequest,
  ProviderAdapter,
} from '../types.js';
import { assertAuthenticatedTenant, canCancelIntegrationOperation, canReadIntegrations } from './rbac.js';
import { IntegrationError, IntegrationNotImplementedError } from './errors.js';
import { IntegrationStore } from './store.js';

export type ProviderStatusView = {
  providerKey: IntegrationProviderKey;
  displayName: string;
  status: 'NOT_CONFIGURED';
  defaultStatus: 'NOT_CONFIGURED';
  connected: false;
  live: false;
  trained: false;
  productionReady: false;
  envVarPresentDoesNotConnect: true;
  externalDataTransfer: boolean;
  tenantPolicyEnabled: boolean;
  healthCheck: 'SKIPPED';
  note: string;
};

export type IntegrationListView = {
  providers: ProviderStatusView[];
  healthCheck: 'SKIPPED';
  note: string;
};

const STATUS_NOTE =
  'Provider is NOT_CONFIGURED. An API key or configuration does not mean CONNECTED. No live provider call was made.';

export class IntegrationControlService {
  private readonly store: IntegrationStore;
  readonly registry: IntegrationRegistry;

  constructor(pool: Pool) {
    this.store = new IntegrationStore(pool);
    this.registry = new IntegrationRegistry({
      validateRequest: (context, request) => this.validateRequest(context, request),
      createOperation: (context, request) => this.createOperation(context, request),
      cancelOperation: (context, operationId) => this.cancelOperation(context, operationId),
    });
  }

  adapter(providerKey: string): ProviderAdapter {
    return this.registry.get(providerKey);
  }

  async loadPolicySnapshot(
    context: TenantContext,
    providerKey: IntegrationProviderKey,
  ): Promise<Parameters<typeof evaluateIntegrationPolicy>[2]> {
    return this.store.withClient(async (client) => {
      const provider = await this.store.getProvider(client, providerKey);
      const policy = await this.store.getTenantPolicy(client, context, providerKey);
      const monthlyRequestCount = await this.store.countMonthlyRequests(client, context, providerKey);
      return {
        providerKey,
        providerStatus: provider?.defaultStatus ?? 'NOT_CONFIGURED',
        policy,
        monthlyRequestCount,
      };
    });
  }

  async validateRequest(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationPolicyDecision> {
    assertAuthenticatedTenant(context);
    const snapshot = await this.loadPolicySnapshot(context, request.providerKey);
    return evaluateIntegrationPolicy(context, request, snapshot);
  }

  async listProviders(context: TenantContext): Promise<IntegrationListView> {
    assertAuthenticatedTenant(context);
    if (!canReadIntegrations(context.role)) {
      throw new IntegrationError(403, 'INTEGRATION_ROLE_REQUIRED', 'Role cannot read integrations.');
    }

    return this.store.withClient(async (client) => {
      const providers = await this.store.listProviders(client);
      const views: ProviderStatusView[] = [];
      for (const provider of providers) {
        views.push(await this.toStatusView(client, context, provider));
      }
      await this.writeAudit(client, context, {
        eventType: 'INTEGRATION_HEALTH_CHECK_SKIPPED',
        providerKey: 'ROBOFLOW',
        operationType: 'HEALTH_CHECK',
        metadata: { listedProviders: providers.length, skippedLiveHealth: true },
      });
      return {
        providers: views,
        healthCheck: 'SKIPPED',
        note: STATUS_NOTE,
      };
    });
  }

  async getProviderStatus(
    context: TenantContext,
    providerKey: IntegrationProviderKey,
  ): Promise<ProviderStatusView> {
    assertAuthenticatedTenant(context);
    if (!canReadIntegrations(context.role)) {
      throw new IntegrationError(403, 'INTEGRATION_ROLE_REQUIRED', 'Role cannot read integrations.');
    }

    return this.store.withClient(async (client) => {
      const provider = await this.store.getProvider(client, providerKey);
      if (!provider) {
        throw new IntegrationError(404, 'INTEGRATION_PROVIDER_UNKNOWN', 'Unknown integration provider.');
      }
      const view = await this.toStatusView(client, context, provider);
      await this.writeAudit(client, context, {
        eventType: 'INTEGRATION_HEALTH_CHECK_SKIPPED',
        providerKey,
        operationType: 'HEALTH_CHECK',
        metadata: { skippedLiveHealth: true },
      });
      return view;
    });
  }

  async createOperation(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationOperation> {
    assertAuthenticatedTenant(context);
    const requestDigest = requestDigestFor({
      providerKey: request.providerKey,
      operationType: request.operationType,
      purpose: request.purpose,
      dataClassification: request.dataClassification,
      idempotencyKey: request.idempotencyKey,
      payloadReferencePresent: request.payloadReference !== undefined,
    });

    return this.store.withClient(async (client) => {
      await this.writeAudit(client, context, {
        eventType: 'INTEGRATION_REQUESTED',
        providerKey: request.providerKey,
        operationType: request.operationType,
        requestDigest,
      });

      const existing = await this.store.findByIdempotency(
        client,
        context,
        request.providerKey,
        request.idempotencyKey,
      );
      if (existing) {
        return this.hydrateOperation(client, context, existing);
      }

      const provider = await this.store.getProvider(client, request.providerKey);
      const policy = await this.store.getTenantPolicy(client, context, request.providerKey);
      const monthlyRequestCount = await this.store.countMonthlyRequests(
        client,
        context,
        request.providerKey,
      );
      const decision = evaluateIntegrationPolicy(context, request, {
        providerKey: request.providerKey,
        providerStatus: provider?.defaultStatus ?? 'NOT_CONFIGURED',
        policy,
        monthlyRequestCount,
      });

      const operation = await this.store.insertOperation(client, context, request, {
        state: decision.state,
        errorCode: decision.reasonCode,
        requestDigest,
        safeSummary: safeSummaryFor(decision),
        requireHumanApproval: decision.requireHumanApproval,
      });

      await this.writeAudit(client, context, {
        eventType: auditEventForDecision(decision),
        providerKey: request.providerKey,
        operationType: request.operationType,
        operationId: operation.id,
        requestDigest,
        reasonCode: decision.reasonCode,
        nextState: decision.state,
      });

      return { ...operation, requireHumanApproval: decision.requireHumanApproval };
    });
  }

  async getOperation(context: TenantContext, operationId: string): Promise<IntegrationOperation> {
    assertAuthenticatedTenant(context);
    if (!canReadIntegrations(context.role)) {
      throw new IntegrationError(403, 'INTEGRATION_ROLE_REQUIRED', 'Role cannot read integration operations.');
    }

    return this.store.withClient(async (client) => {
      const operation = await this.store.getOperation(client, context, operationId);
      if (!operation) {
        throw new IntegrationError(
          404,
          'INTEGRATION_OPERATION_NOT_FOUND',
          'integration operation not found for this organization',
        );
      }
      return this.hydrateOperation(client, context, operation);
    });
  }

  async cancelOperation(context: TenantContext, operationId: string): Promise<IntegrationOperation> {
    assertAuthenticatedTenant(context);

    return this.store.withClient(async (client) => {
      const existing = await this.store.getOperation(client, context, operationId);
      if (!existing) {
        throw new IntegrationError(
          404,
          'INTEGRATION_OPERATION_NOT_FOUND',
          'integration operation not found for this organization',
        );
      }

      if (!canCancelIntegrationOperation(context.role)) {
        throw new IntegrationError(
          403,
          'INTEGRATION_CANCELLATION_FORBIDDEN',
          'Only OWNER or ESG_LEAD may cancel integration operations.',
        );
      }

      const current = await this.hydrateOperation(client, context, existing);
      if (current.state === 'CANCELLED' || current.state === 'EXPIRED') {
        return current;
      }

      const cancelled = await this.store.cancelOperation(client, context, operationId);
      if (!cancelled) {
        throw new IntegrationError(
          404,
          'INTEGRATION_OPERATION_NOT_FOUND',
          'integration operation not found for this organization',
        );
      }

      await this.writeAudit(client, context, {
        eventType: 'INTEGRATION_CANCELLED',
        providerKey: cancelled.providerKey,
        operationType: cancelled.operationType,
        operationId: cancelled.id,
        previousState: existing.state,
        nextState: 'CANCELLED',
        requestDigest: cancelled.requestDigestSha256,
      });

      return cancelled;
    });
  }

  executeOperation(): Promise<never> {
    return this.adapter('ROBOFLOW').executeOperation();
  }

  private async hydrateOperation(
    client: PoolClient,
    context: TenantContext,
    operation: IntegrationOperation,
  ): Promise<IntegrationOperation> {
    const hydrated = await this.store.expireOverdueNotConfigured(client, context, operation);
    if (hydrated.state === 'EXPIRED' && operation.state !== 'EXPIRED') {
      await this.writeAudit(client, context, {
        eventType: 'INTEGRATION_EXPIRED',
        providerKey: hydrated.providerKey,
        operationType: hydrated.operationType,
        operationId: hydrated.id,
        previousState: operation.state,
        nextState: 'EXPIRED',
        requestDigest: hydrated.requestDigestSha256,
        reasonCode: 'INTEGRATION_OPERATION_EXPIRED',
      });
    }
    return hydrated;
  }

  private async toStatusView(
    client: PoolClient,
    context: TenantContext,
    provider: IntegrationProviderRecord,
  ): Promise<ProviderStatusView> {
    const adapterStatus = await this.registry.get(provider.providerKey).getStatus(context);
    const policy = await this.store.getTenantPolicy(client, context, provider.providerKey);
    const probe = probeProviderConfig(provider.providerKey);
    void probe.envVarPresent;
    void adapterStatus;
    return {
      providerKey: provider.providerKey,
      displayName: provider.displayName,
      status: 'NOT_CONFIGURED',
      defaultStatus: 'NOT_CONFIGURED',
      connected: false,
      live: false,
      trained: false,
      productionReady: false,
      envVarPresentDoesNotConnect: true,
      externalDataTransfer: provider.externalDataTransfer,
      tenantPolicyEnabled: policy?.enabled === true,
      healthCheck: 'SKIPPED',
      note: STATUS_NOTE,
    };
  }

  private async writeAudit(
    client: PoolClient,
    context: TenantContext,
    event: {
      eventType: IntegrationAuditEventType;
      providerKey: IntegrationProviderKey;
      operationType?: string;
      operationId?: string | null;
      requestDigest?: string | null;
      reasonCode?: string | null;
      previousState?: IntegrationOperation['state'] | null;
      nextState?: IntegrationOperation['state'] | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await insertIntegrationAuditEvent(client, context, event);
  }
}

function auditEventForDecision(decision: IntegrationPolicyDecision): IntegrationAuditEventType {
  if (decision.state === 'NOT_CONFIGURED') {
    return 'INTEGRATION_NOT_CONFIGURED';
  }
  if (decision.state === 'QUEUED') {
    return 'INTEGRATION_QUEUED';
  }
  return 'INTEGRATION_BLOCKED';
}

function safeSummaryFor(decision: IntegrationPolicyDecision): string {
  if (decision.state === 'NOT_CONFIGURED') {
    return 'Operation recorded. Provider is NOT_CONFIGURED. No external provider call was made.';
  }
  if (decision.state === 'QUEUED') {
    return 'Operation queued pending human approval. Provider execution is not implemented in v0.1.';
  }
  return `Operation blocked (${decision.reasonCode}). No external provider call was made.`;
}

export { IntegrationNotImplementedError };
