import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../auth/types.js';
import { assertNever } from '../../contracts.js';
import { digestRequest } from '../audit.js';
import { loadProviderRuntimeConfig } from '../config.js';
import { IntegrationError } from '../core/errors.js';
import { canCreateIntegrationOperation } from '../core/rbac.js';
import {
  type IntegrationDataClassification,
  type IntegrationOperation,
  type IntegrationPolicyDecision,
  type IntegrationRequest,
  type IntegrationSystemContext,
  type ProviderAdapter,
  type ProviderHealthResult,
  type ProviderRuntimeConfig,
} from '../types.js';
import { DEFAULT_TINKER_MODEL_REFERENCES } from './allowlist.js';
import { parseTinkerPayload, type TinkerPayload } from './schema.js';
import {
  TINKER_CAPABILITY_URL,
  TINKER_INTENT_URL,
  type InjectedTransport,
} from './transport.js';

export interface TinkerAdapterOptions {
  transport?: InjectedTransport | null;
  env?: NodeJS.ProcessEnv;
  allowListedModelReferences?: readonly string[];
}

interface StoredOperation {
  operation: IntegrationOperation;
  approvalReference: string | null;
  payload: TinkerPayload | null;
}

export class TinkerAdapter implements ProviderAdapter {
  readonly providerKey = 'TINKER' as const;
  private readonly transport: InjectedTransport | null;
  private readonly env: NodeJS.ProcessEnv;
  private readonly allowListedModelReferences: readonly string[];
  private readonly operations = new Map<string, StoredOperation>();
  private readonly idempotency = new Map<string, string>();

  constructor(options: TinkerAdapterOptions = {}) {
    this.transport = options.transport ?? null;
    this.env = options.env ?? process.env;
    this.allowListedModelReferences = options.allowListedModelReferences ?? DEFAULT_TINKER_MODEL_REFERENCES;
  }

  async getStatus(_context: TenantContext): Promise<ProviderHealthResult> {
    return this.resolveHealth();
  }

  async checkHealth(_systemContext: IntegrationSystemContext): Promise<ProviderHealthResult> {
    return this.resolveHealth();
  }

  async validateRequest(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationPolicyDecision> {
    const schema = this.evaluateRequestShape(context, request);
    if (!schema.allowed) {
      return schema;
    }

    const runtime = this.runtime();
    const runtimeGate = this.evaluateRuntime(runtime);
    if (!runtimeGate.allowed) {
      return runtimeGate;
    }

    if (!request.approvalReference || request.approvalReference.trim().length === 0) {
      return {
        allowed: false,
        reasonCode: 'HUMAN_APPROVAL_REQUIRED',
        message:
          'Tinker training-job INTENT is high-impact. Durable human approval is required before the intent may be queued. Not trained. Not complete. Not connected. No RL update was applied.',
        resultingState: 'REQUESTED',
        providerStatus: 'DISABLED',
      };
    }

    const health = await this.resolveHealth();
    if (health.status !== 'AVAILABLE') {
      return {
        allowed: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
        message:
          'Tinker training-job INTENT is recorded only after enable, credential, and a successful injected health check. Credential presence is not trained, complete, or CONNECTED.',
        resultingState: 'NOT_CONFIGURED',
        providerStatus: health.status === 'DISABLED' ? 'DISABLED' : 'NOT_CONFIGURED',
      };
    }

    return {
      allowed: true,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message:
        'Tinker training-job INTENT may be queued locally. This is not a trained model, not a completed job, and not CONNECTED. No RL behavior is invoked.',
      resultingState: 'QUEUED',
      providerStatus: 'AVAILABLE',
    };
  }

  async createOperation(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationOperation> {
    const existingId = this.idempotency.get(idempotencyKey(context.organizationId, request.idempotencyKey));
    if (existingId) {
      const existing = this.operations.get(existingId);
      if (existing) {
        return existing.operation;
      }
    }

    const decision = await this.validateRequest(context, request);
    const parsed = parseTinkerPayload(request.payload, this.allowListedModelReferences);
    const now = new Date().toISOString();
    const operation: IntegrationOperation = {
      id: randomUUID(),
      organizationId: context.organizationId,
      providerKey: 'TINKER',
      operationType: request.operationType,
      state: decision.resultingState,
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
      responseDigestSha256: null,
      safeSummary: decision.message,
      providerJobReference: null,
      requestedBy: context.actorId,
      startedAt: null,
      completedAt: null,
      expiresAt: null,
      errorCode: decision.allowed ? null : decision.reasonCode,
      correlationId: context.correlationId,
      createdAt: now,
      updatedAt: now,
    };

    this.operations.set(operation.id, {
      operation,
      approvalReference: request.approvalReference ?? null,
      payload: parsed.ok ? parsed.value : null,
    });
    this.idempotency.set(idempotencyKey(context.organizationId, request.idempotencyKey), operation.id);
    return operation;
  }

  async executeOperation(
    systemContext: IntegrationSystemContext,
    operation: IntegrationOperation,
  ): Promise<IntegrationOperation> {
    const health = await this.checkHealth(systemContext);
    if (health.status !== 'AVAILABLE') {
      return this.update(operation, {
        state: 'NOT_CONFIGURED',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        safeSummary:
          'Tinker training job INTENT was not executed. Provider is not AVAILABLE. Not trained. Not complete. Not connected.',
        completedAt: new Date().toISOString(),
      });
    }

    const stored = this.operations.get(operation.id);
    const approval = stored?.approvalReference;
    if (!approval || approval.trim().length === 0) {
      return this.update(operation, {
        state: 'REQUESTED',
        errorCode: 'HUMAN_APPROVAL_REQUIRED',
        safeSummary:
          'Tinker training job INTENT was not executed. Human approval is required. Not trained. Not complete. Not connected.',
      });
    }

    if (this.transport) {
      await this.transport.request(TINKER_INTENT_URL, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'TINKER_TRAINING_JOB_INTENT',
          datasetDigestSha256: stored?.payload?.datasetDigestSha256 ?? null,
          approvedDatasetRef: stored?.payload?.approvedDatasetRef ?? null,
          modelReference: stored?.payload?.modelReference ?? null,
          trained: false,
          complete: false,
          connected: false,
        }),
      });
    }

    return this.update(operation, {
      state: 'QUEUED',
      errorCode: null,
      providerJobReference: `tinker-intent:${operation.id}`,
      safeSummary:
        'Tinker training job INTENT recorded. Not trained. Not complete. Not connected. Result is DRAFT / INPUT_UNVERIFIED. No RL update was applied.',
    });
  }

  async cancelOperation(
    _context: TenantContext,
    operationId: string,
  ): Promise<IntegrationOperation> {
    const stored = this.operations.get(operationId);
    if (!stored) {
      throw new IntegrationError('OPERATION_NOT_FOUND', 'tinker adapter has no local operation to cancel', 404);
    }
    const updated = this.update(stored.operation, {
      state: 'CANCELLED',
      errorCode: stored.operation.errorCode,
      safeSummary: 'Cancelled locally. No Tinker HTTP was performed. Not trained. Not complete. Not connected.',
      completedAt: new Date().toISOString(),
    });
    return updated;
  }

  private evaluateRequestShape(
    context: TenantContext,
    request: IntegrationRequest,
  ): IntegrationPolicyDecision {
    if (!canCreateIntegrationOperation(context.role)) {
      return deny(
        'ROLE_FORBIDDEN',
        'role is not permitted to create Tinker training-job INTENT operations',
        'BLOCKED',
        'DISABLED',
      );
    }
    if (request.providerKey !== 'TINKER') {
      return deny(
        'PROVIDER_NOT_ALLOWLISTED',
        'Tinker adapter only accepts TINKER providerKey',
        'BLOCKED',
        'DISABLED',
      );
    }
    if (request.operationType !== 'TINKER_TRAINING_JOB_REQUEST') {
      return deny(
        'OPERATION_NOT_SUPPORTED',
        'Tinker v0.1 only accepts TINKER_TRAINING_JOB_REQUEST intent',
        'BLOCKED',
        'DISABLED',
      );
    }
    if (request.purpose !== 'TINKER_TRAINING_JOB_REQUEST') {
      return deny(
        'PURPOSE_NOT_ALLOWED',
        'Tinker purpose must be TINKER_TRAINING_JOB_REQUEST',
        'BLOCKED',
        'DISABLED',
      );
    }
    if (!request.idempotencyKey || request.idempotencyKey.trim().length === 0) {
      return deny('IDEMPOTENCY_KEY_REQUIRED', 'idempotencyKey is required', 'BLOCKED', 'NOT_CONFIGURED');
    }

    const restricted = denyIfRestricted(request.dataClassification);
    if (restricted) {
      return restricted;
    }

    const parsed = parseTinkerPayload(request.payload, this.allowListedModelReferences);
    if (!parsed.ok) {
      if (parsed.field === 'modelReference') {
        return deny(
          'PROVIDER_NOT_ALLOWLISTED',
          'modelReference is not on the Tinker allow-list. URLs are rejected.',
          'BLOCKED',
          'DISABLED',
        );
      }
      if (parsed.field) {
        return deny(
          'UNSAFE_PAYLOAD_FIELD',
          `payload must not include ${parsed.field}. Tinker accepts metadata digests and internal refs only.`,
          'BLOCKED',
          'DISABLED',
        );
      }
      return deny(
        'SCHEMA_VALIDATION_FAILED',
        'Tinker payload requires datasetDigestSha256, approvedDatasetRef (earth://internal/...), and an allow-listed modelReference. Raw training data is forbidden.',
        'BLOCKED',
        'DISABLED',
      );
    }

    return {
      allowed: true,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message: 'Tinker payload schema ok. Intent only.',
      resultingState: 'REQUESTED',
      providerStatus: 'NOT_CONFIGURED',
    };
  }

  private evaluateRuntime(runtime: ProviderRuntimeConfig): IntegrationPolicyDecision {
    if (!runtime.credentialPresent && !runtime.enabled) {
      return deny(
        'PROVIDER_NOT_CONFIGURED',
        'Tinker is not configured and is disabled by default. Not trained. Not connected.',
        'NOT_CONFIGURED',
        'NOT_CONFIGURED',
      );
    }
    if (runtime.credentialPresent && !runtime.enabled) {
      return deny(
        'PROVIDER_DISABLED',
        'a configured Tinker credential does not enable the provider and is not trained or CONNECTED',
        'BLOCKED',
        'DISABLED',
      );
    }
    if (runtime.enabled && !runtime.credentialPresent) {
      return deny(
        'PROVIDER_NOT_CONFIGURED',
        'Tinker enable flag is set but no server-side credential is present',
        'NOT_CONFIGURED',
        'NOT_CONFIGURED',
      );
    }
    return {
      allowed: true,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message: 'Tinker credential and enable flag are present; injected health is still required. CONNECTED is not granted.',
      resultingState: 'REQUESTED',
      providerStatus: 'NOT_CONFIGURED',
    };
  }

  private async resolveHealth(): Promise<ProviderHealthResult> {
    const runtime = this.runtime();
    const checkedAt = new Date().toISOString();
    const base = {
      providerKey: this.providerKey,
      configured: runtime.credentialPresent,
      enabled: runtime.enabled,
      connected: false as const,
      checkedAt,
    };

    if (!runtime.enabled && !runtime.credentialPresent) {
      return {
        ...base,
        status: 'NOT_CONFIGURED',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }
    if (runtime.credentialPresent && !runtime.enabled) {
      return {
        ...base,
        status: 'DISABLED',
        healthy: false,
        reasonCode: 'PROVIDER_DISABLED',
      };
    }
    if (runtime.enabled && !runtime.credentialPresent) {
      return {
        ...base,
        status: 'NOT_CONFIGURED',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }
    if (!this.transport) {
      return {
        ...base,
        status: 'NOT_CONFIGURED',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }

    try {
      const response = await this.transport.request(TINKER_CAPABILITY_URL, {
        method: 'GET',
        headers: { accept: 'application/json' },
      });
      if (response.status !== 200) {
        return {
          ...base,
          status: 'DEGRADED',
          healthy: false,
          reasonCode: 'PROVIDER_NOT_CONFIGURED',
        };
      }
      const body: unknown = await response.json();
      const interpretation = interpretCapability(body);
      switch (interpretation) {
        case 'available':
          return {
            ...base,
            status: 'AVAILABLE',
            healthy: true,
            reasonCode: 'PROVIDER_NOT_CONFIGURED',
          };
        case 'connected-forbidden':
          return {
            ...base,
            status: 'DEGRADED',
            healthy: false,
            reasonCode: 'CONNECTED_STATUS_FORBIDDEN',
          };
        case 'degraded':
          return {
            ...base,
            status: 'DEGRADED',
            healthy: false,
            reasonCode: 'PROVIDER_NOT_CONFIGURED',
          };
        default:
          return assertNever(interpretation);
      }
    } catch {
      return {
        ...base,
        status: 'ERROR',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }
  }

  private runtime(): ProviderRuntimeConfig {
    return loadProviderRuntimeConfig('TINKER', this.env);
  }

  private update(
    operation: IntegrationOperation,
    patch: Partial<
      Pick<
        IntegrationOperation,
        'state' | 'errorCode' | 'safeSummary' | 'completedAt' | 'providerJobReference'
      >
    >,
  ): IntegrationOperation {
    const updated: IntegrationOperation = {
      ...operation,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const stored = this.operations.get(operation.id);
    if (stored) {
      stored.operation = updated;
    }
    return updated;
  }
}

export function createAdapter(options: TinkerAdapterOptions = {}): ProviderAdapter {
  return new TinkerAdapter(options);
}

function interpretCapability(body: unknown): 'available' | 'connected-forbidden' | 'degraded' {
  if (!body || typeof body !== 'object') {
    return 'degraded';
  }
  const record = body as Record<string, unknown>;
  if (
    record.connected === true ||
    record.trained === true ||
    record.complete === true ||
    record.liveInference === true
  ) {
    return 'connected-forbidden';
  }
  if (record.capable === true || record.ok === true) {
    return 'available';
  }
  return 'degraded';
}

function denyIfRestricted(classification: IntegrationDataClassification): IntegrationPolicyDecision | null {
  switch (classification) {
    case 'RESTRICTED':
      return deny(
        'RESTRICTED_DATA_BLOCKED',
        'RESTRICTED data must never leave EARTH through Tinker',
        'BLOCKED',
        'DISABLED',
      );
    case 'PUBLIC':
    case 'INTERNAL':
    case 'CONFIDENTIAL':
      return null;
    default:
      return assertNever(classification);
  }
}

function deny(
  reasonCode: IntegrationPolicyDecision['reasonCode'],
  message: string,
  resultingState: IntegrationPolicyDecision['resultingState'],
  providerStatus: IntegrationPolicyDecision['providerStatus'],
): IntegrationPolicyDecision {
  return {
    allowed: false,
    reasonCode,
    message,
    resultingState,
    providerStatus,
  };
}

function idempotencyKey(organizationId: string, key: string): string {
  return `${organizationId}:${key}`;
}
