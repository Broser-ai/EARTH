import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { requireRole } from '../../auth/roles.js';
import type { TenantContext } from '../../auth/types.js';
import { assertNever } from '../../contracts.js';
import { digestRequest, writeIntegrationAudit } from '../audit.js';
import type { IntegrationRuntimeConfig } from '../config.js';
import { evaluateIntegrationPolicy } from '../policy.js';
import type { IntegrationRegistry } from '../registry.js';
import {
  isIntegrationProviderKey,
  type IntegrationOperation,
  type IntegrationProviderKey,
  type IntegrationRequest,
  type IntegrationSystemContext,
  type ProviderHealthResult,
} from '../types.js';
import type { AdapterCapabilities } from './capabilities.js';
import { clampIntegrationTimeoutMs } from './capabilities.js';
import { IntegrationError } from './errors.js';
import { providerOutboundProbe } from './probe.js';
import {
  canCancelIntegrationOperation,
  canCreateIntegrationOperation,
  canReadIntegrations,
  READ_ROLES,
  WRITE_ROLES,
} from './rbac.js';
import { IntegrationStore, type ProviderCatalogRow } from './store.js';

export interface ProviderStatusView extends ProviderHealthResult {
  displayName: string;
  externalDataTransfer: boolean;
  connected: false;
  capabilities: AdapterCapabilities;
}

export interface CreateOperationResult {
  operation: IntegrationOperation;
  replayed: boolean;
}

export class IntegrationService {
  private readonly store: IntegrationStore;

  constructor(
    pool: Pool,
    private readonly registry: IntegrationRegistry,
    private readonly runtime: IntegrationRuntimeConfig,
  ) {
    this.store = new IntegrationStore(pool);
  }

  async listProviders(tenant: TenantContext): Promise<ProviderStatusView[]> {
    assertCanRead(tenant);
    return this.store.withTransaction(async (client) => {
      const catalog = await this.store.listProviders(client);
      const views: ProviderStatusView[] = [];
      for (const row of catalog) {
        views.push(await this.statusView(tenant, row));
      }
      return views;
    });
  }

  async getProviderStatus(
    tenant: TenantContext,
    providerKey: string,
  ): Promise<ProviderStatusView> {
    assertCanRead(tenant);
    const key = parseProviderKey(providerKey);
    return this.store.withTransaction(async (client) => {
      const catalog = await this.store.listProviders(client);
      const row = catalog.find((item) => item.providerKey === key);
      if (!row) {
        throw new IntegrationError('PROVIDER_NOT_ALLOWLISTED', 'unknown provider', 404);
      }
      const view = await this.statusView(tenant, row);
      await writeIntegrationAudit(client, {
        organizationId: tenant.organizationId,
        actorId: tenant.actorId,
        authMode: tenant.authMode,
        eventType: 'INTEGRATION_HEALTH_CHECKED',
        providerKey: key,
        reasonCode: view.reasonCode,
        extra: { configured: view.configured, enabled: view.enabled, connected: false },
      });
      return view;
    });
  }

  async createOperation(
    tenant: TenantContext,
    request: IntegrationRequest,
  ): Promise<CreateOperationResult> {
    if (!canCreateIntegrationOperation(tenant.role)) {
      requireRole(tenant.role, WRITE_ROLES);
    }

    const callsBefore = providerOutboundProbe.calls;

    const result = await this.store.withTransaction(async (client) => {
      const existing = await this.store.findOperationByIdempotency(
        client,
        tenant.organizationId,
        request.providerKey,
        request.idempotencyKey,
      );
      if (existing) {
        return { operation: existing, replayed: true };
      }

      const tenantPolicy = await this.store.getTenantPolicy(
        client,
        tenant.organizationId,
        request.providerKey,
      );
      const monthlyRequestCount = await this.store.countMonthlyRequests(
        client,
        tenant.organizationId,
        request.providerKey,
      );
      const adapter = this.registry.get(request.providerKey);
      let decision = evaluateIntegrationPolicy({
        role: tenant.role,
        request,
        runtime: this.runtime.providers[request.providerKey],
        tenantPolicy,
        monthlyRequestCount,
        monthlyEstimatedCostDkk: 0,
        approvalVerified: false,
      });
      if (decision.allowed) {
        const adapterDecision = await adapter.validateRequest(tenant, request);
        if (!adapterDecision.allowed) {
          decision = adapterDecision;
        }
      }

      const health = await adapter.getStatus(tenant);
      const state = decision.resultingState;
      const errorCode = decision.allowed && health.status === 'AVAILABLE' ? null : decision.reasonCode;
      const persistedState =
        health.status === 'AVAILABLE' && decision.allowed ? state : decision.resultingState;
      const timeoutMs = clampIntegrationTimeoutMs(request.timeoutMs);
      const expiresAt = new Date(Date.now() + timeoutMs).toISOString();

      const operation = await this.store.insertOperation(client, {
        id: randomUUID(),
        organizationId: tenant.organizationId,
        providerKey: request.providerKey,
        operationType: request.operationType,
        state: persistedState,
        idempotencyKey: request.idempotencyKey,
        purpose: request.purpose,
        dataClassification: request.dataClassification,
        requestDigestSha256: digestRequest({
          providerKey: request.providerKey,
          operationType: request.operationType,
          purpose: request.purpose,
          dataClassification: request.dataClassification,
          idempotencyKey: request.idempotencyKey,
        }),
        safeSummary: decision.message,
        requestedBy: tenant.actorId,
        errorCode,
        correlationId: tenant.correlationId,
        expiresAt,
      });

      await writeIntegrationAudit(client, {
        organizationId: tenant.organizationId,
        actorId: tenant.actorId,
        authMode: tenant.authMode,
        eventType: 'INTEGRATION_REQUESTED',
        providerKey: request.providerKey,
        operation,
        nextState: operation.state,
        reasonCode: decision.reasonCode,
      });

      const followUp =
        operation.state === 'NOT_CONFIGURED'
          ? 'INTEGRATION_NOT_CONFIGURED'
          : operation.state === 'BLOCKED'
            ? 'INTEGRATION_BLOCKED'
            : operation.state === 'QUEUED'
              ? 'INTEGRATION_QUEUED'
              : null;
      if (followUp) {
        await writeIntegrationAudit(client, {
          organizationId: tenant.organizationId,
          actorId: tenant.actorId,
          authMode: tenant.authMode,
          eventType: followUp,
          providerKey: request.providerKey,
          operation,
          nextState: operation.state,
          reasonCode: decision.reasonCode,
        });
      }

      return { operation, replayed: false };
    });

    if (providerOutboundProbe.calls !== callsBefore) {
      throw new IntegrationError(
        'PROVIDER_NOT_CONFIGURED',
        'outbound provider calls are forbidden from the control plane request path',
        500,
      );
    }

    return result;
  }

  async getOperation(tenant: TenantContext, operationId: string): Promise<IntegrationOperation> {
    assertCanRead(tenant);
    return this.store.withTransaction(async (client) => {
      const existing = await this.store.getOperation(client, tenant.organizationId, operationId);
      if (!existing) {
        throw new IntegrationError('OPERATION_NOT_FOUND', 'operation not found for this organization', 404);
      }
      const expired = await this.store.expireOverdue(client, tenant.organizationId, operationId);
      if (expired) {
        await writeIntegrationAudit(client, {
          organizationId: tenant.organizationId,
          actorId: tenant.actorId,
          authMode: tenant.authMode,
          eventType: 'INTEGRATION_EXPIRED',
          providerKey: expired.providerKey,
          operation: expired,
          previousState: existing.state,
          nextState: 'EXPIRED',
          reasonCode: 'OPERATION_EXPIRED',
        });
        return expired;
      }
      return existing;
    });
  }

  async cancelOperation(tenant: TenantContext, operationId: string): Promise<IntegrationOperation> {
    if (!canCancelIntegrationOperation(tenant.role)) {
      requireRole(tenant.role, WRITE_ROLES);
    }
    const callsBefore = providerOutboundProbe.calls;
    const cancelled = await this.store.withTransaction(async (client) => {
      const existing = await this.store.getOperation(client, tenant.organizationId, operationId);
      if (!existing) {
        throw new IntegrationError('OPERATION_NOT_FOUND', 'operation not found for this organization', 404);
      }
      const expired = await this.store.expireOverdue(client, tenant.organizationId, operationId);
      if (expired) {
        await writeIntegrationAudit(client, {
          organizationId: tenant.organizationId,
          actorId: tenant.actorId,
          authMode: tenant.authMode,
          eventType: 'INTEGRATION_EXPIRED',
          providerKey: expired.providerKey,
          operation: expired,
          previousState: existing.state,
          nextState: 'EXPIRED',
          reasonCode: 'OPERATION_EXPIRED',
        });
        throw new IntegrationError(
          'OPERATION_NOT_CANCELLABLE',
          'operation in state EXPIRED cannot be cancelled',
          409,
        );
      }
      if (
        existing.state === 'SUCCEEDED' ||
        existing.state === 'FAILED' ||
        existing.state === 'CANCELLED' ||
        existing.state === 'EXPIRED'
      ) {
        throw new IntegrationError(
          'OPERATION_NOT_CANCELLABLE',
          `operation in state ${existing.state} cannot be cancelled`,
          409,
        );
      }
      const updated = await this.store.updateOperationState(
        client,
        tenant.organizationId,
        operationId,
        'CANCELLED',
        existing.errorCode,
        'Cancelled before any provider execution. No external call was made.',
      );
      if (!updated) {
        throw new IntegrationError('OPERATION_NOT_FOUND', 'operation not found for this organization', 404);
      }
      await writeIntegrationAudit(client, {
        organizationId: tenant.organizationId,
        actorId: tenant.actorId,
        authMode: tenant.authMode,
        eventType: 'INTEGRATION_CANCELLED',
        providerKey: updated.providerKey,
        operation: updated,
        previousState: existing.state,
        nextState: 'CANCELLED',
      });
      return updated;
    });
    if (providerOutboundProbe.calls !== callsBefore) {
      throw new IntegrationError(
        'PROVIDER_NOT_CONFIGURED',
        'outbound provider calls are forbidden from cancel',
        500,
      );
    }
    return cancelled;
  }

  async executeOperation(
    tenant: TenantContext,
    operationId: string,
  ): Promise<IntegrationOperation> {
    const operation = await this.getOperation(tenant, operationId);
    switch (operation.state) {
      case 'EXPIRED':
      case 'CANCELLED':
      case 'SUCCEEDED':
      case 'FAILED':
        return operation;
      case 'NOT_CONFIGURED':
      case 'BLOCKED': {
        const adapter = this.registry.get(operation.providerKey);
        const result = await adapter.executeOperation(systemContextFrom(tenant), operation);
        await this.store.withTransaction(async (client) => {
          if (operation.state === 'NOT_CONFIGURED') {
            await this.store.updateOperationState(
              client,
              tenant.organizationId,
              operation.id,
              result.state,
              result.errorCode,
              result.safeSummary,
            );
          }
          const eventType =
            result.state === 'NOT_CONFIGURED' ? 'INTEGRATION_NOT_CONFIGURED' : 'INTEGRATION_FAILED';
          await writeIntegrationAudit(client, {
            organizationId: tenant.organizationId,
            actorId: tenant.actorId,
            authMode: tenant.authMode,
            eventType,
            providerKey: operation.providerKey,
            operation,
            previousState: operation.state,
            nextState: operation.state,
            reasonCode: result.errorCode ?? operation.errorCode,
          });
        });
        return result;
      }
      case 'REQUESTED':
      case 'QUEUED':
      case 'RUNNING':
        throw new IntegrationError(
          'PROVIDER_NOT_CONFIGURED',
          'executeOperation is server-side only and refuses unconfigured providers',
          400,
        );
      default:
        return assertNever(operation.state);
    }
  }

  private async statusView(
    tenant: TenantContext,
    row: ProviderCatalogRow,
  ): Promise<ProviderStatusView> {
    const runtime = this.runtime.providers[row.providerKey];
    const adapter = this.registry.get(row.providerKey);
    const health = await adapter.getStatus(tenant);
    return {
      providerKey: row.providerKey,
      displayName: row.displayName,
      externalDataTransfer: row.externalDataTransfer,
      status: health.status,
      configured: runtime.credentialPresent,
      enabled: runtime.enabled,
      healthy: health.healthy,
      connected: false,
      reasonCode: health.reasonCode,
      checkedAt: health.checkedAt,
      capabilities: adapter.capabilities,
    };
  }
}

function assertCanRead(tenant: TenantContext): void {
  if (!canReadIntegrations(tenant.role)) {
    requireRole(tenant.role, READ_ROLES);
  }
}

function parseProviderKey(value: string): IntegrationProviderKey {
  const normalized = value.trim().toUpperCase();
  if (!isIntegrationProviderKey(normalized)) {
    throw new IntegrationError('PROVIDER_NOT_ALLOWLISTED', 'unknown provider', 404);
  }
  return normalized;
}

function systemContextFrom(tenant: TenantContext): IntegrationSystemContext {
  return {
    correlationId: tenant.correlationId,
    actorId: tenant.actorId,
    timeoutMs: clampIntegrationTimeoutMs(),
  };
}
