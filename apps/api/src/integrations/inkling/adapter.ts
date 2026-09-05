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
import { parseInklingPayload, type InklingPayload } from './schema.js';
import {
  INKLING_CAPABILITY_URL,
  INKLING_INTENT_URL,
  type InjectedTransport,
} from './transport.js';

export interface InklingAdapterOptions {
  transport?: InjectedTransport | null;
  env?: NodeJS.ProcessEnv;
}

interface StoredOperation {
  operation: IntegrationOperation;
  payload: InklingPayload | null;
}

export class InklingAdapter implements ProviderAdapter {
  readonly providerKey = 'INKLING' as const;
  private readonly transport: InjectedTransport | null;
  private readonly env: NodeJS.ProcessEnv;
  private readonly operations = new Map<string, StoredOperation>();
  private readonly idempotency = new Map<string, string>();

  constructor(options: InklingAdapterOptions = {}) {
    this.transport = options.transport ?? null;
    this.env = options.env ?? process.env;
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

    const health = await this.resolveHealth();
    if (health.status !== 'AVAILABLE') {
      return {
        allowed: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
        message:
          'Inkling policy-artifact INTENT stays NOT_CONFIGURED until enable, credential, and injected health succeed. A weights URI is not trained weights and is not CONNECTED.',
        resultingState: 'NOT_CONFIGURED',
        providerStatus: health.status === 'DISABLED' ? 'DISABLED' : 'NOT_CONFIGURED',
      };
    }

    return {
      allowed: true,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message:
        'Inkling policy-artifact INTENT may be recorded as DRAFT / INPUT_UNVERIFIED. Not trained. Not live-inference. Not connected.',
      resultingState: 'REQUESTED',
      providerStatus: 'AVAILABLE',
    };
  }

  async createOperation(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationOperation> {
    const existingId = this.idempotency.get(`${context.organizationId}:${request.idempotencyKey}`);
    if (existingId) {
      const existing = this.operations.get(existingId);
      if (existing) {
        return existing.operation;
      }
    }

    const decision = await this.validateRequest(context, request);
    const parsed = parseInklingPayload(request.payload);
    const now = new Date().toISOString();
    const operation: IntegrationOperation = {
      id: randomUUID(),
      organizationId: context.organizationId,
      providerKey: 'INKLING',
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
      payload: parsed.ok ? parsed.value : null,
    });
    this.idempotency.set(`${context.organizationId}:${request.idempotencyKey}`, operation.id);
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
          'Inkling policy-artifact INTENT was not executed. Provider is not AVAILABLE. Not trained. Not live-inference. Not connected.',
        completedAt: new Date().toISOString(),
      });
    }

    const stored = this.operations.get(operation.id);
    if (this.transport) {
      await this.transport.request(INKLING_INTENT_URL, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'INKLING_POLICY_ARTIFACT_INTENT',
          artifactDigestSha256: stored?.payload?.artifactDigestSha256 ?? null,
          artifactRef: stored?.payload?.artifactRef ?? null,
          trained: false,
          liveInference: false,
          connected: false,
          honesty: 'DRAFT',
        }),
      });
    }

    return this.update(operation, {
      state: 'REQUESTED',
      errorCode: null,
      providerJobReference: `inkling-intent:${operation.id}`,
      safeSummary:
        'Inkling policy artifact INTENT recorded as DRAFT / INPUT_UNVERIFIED. Not trained. Not live-inference. Not connected.',
    });
  }

  async cancelOperation(
    _context: TenantContext,
    operationId: string,
  ): Promise<IntegrationOperation> {
    const stored = this.operations.get(operationId);
    if (!stored) {
      throw new IntegrationError(
        'OPERATION_NOT_FOUND',
        'inkling adapter has no local operation to cancel',
        404,
      );
    }
    return this.update(stored.operation, {
      state: 'CANCELLED',
      errorCode: stored.operation.errorCode,
      safeSummary:
        'Cancelled locally. No Inkling HTTP was performed. Not trained. Not live-inference. Not connected.',
      completedAt: new Date().toISOString(),
    });
  }

  private evaluateRequestShape(
    context: TenantContext,
    request: IntegrationRequest,
  ): IntegrationPolicyDecision {
    if (!canCreateIntegrationOperation(context.role)) {
      return deny(
        'ROLE_FORBIDDEN',
        'role is not permitted to create Inkling policy-artifact INTENT operations',
        'BLOCKED',
        'DISABLED',
      );
    }
    if (request.providerKey !== 'INKLING') {
      return deny(
        'PROVIDER_NOT_ALLOWLISTED',
        'Inkling adapter only accepts INKLING providerKey',
        'BLOCKED',
        'DISABLED',
      );
    }
    if (request.operationType !== 'INKLING_POLICY_ARTIFACT_REQUEST') {
      return deny(
        'OPERATION_NOT_SUPPORTED',
        'Inkling v0.1 only accepts INKLING_POLICY_ARTIFACT_REQUEST intent',
        'BLOCKED',
        'DISABLED',
      );
    }
    if (request.purpose !== 'INKLING_POLICY_ARTIFACT_REQUEST') {
      return deny(
        'PURPOSE_NOT_ALLOWED',
        'Inkling purpose must be INKLING_POLICY_ARTIFACT_REQUEST',
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

    const parsed = parseInklingPayload(request.payload);
    if (!parsed.ok) {
      if (parsed.field) {
        return deny(
          'UNSAFE_PAYLOAD_FIELD',
          `payload must not include ${parsed.field}. Inkling accepts artifact digest and earth://internal/ ref only.`,
          'BLOCKED',
          'DISABLED',
        );
      }
      return deny(
        'SCHEMA_VALIDATION_FAILED',
        'Inkling payload requires artifactDigestSha256 and artifactRef (earth://internal/...). Live inference and trained weights are forbidden.',
        'BLOCKED',
        'DISABLED',
      );
    }

    return {
      allowed: true,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message: 'Inkling payload schema ok. Intent only. DRAFT.',
      resultingState: 'REQUESTED',
      providerStatus: 'NOT_CONFIGURED',
    };
  }

  private evaluateRuntime(runtime: ProviderRuntimeConfig): IntegrationPolicyDecision {
    if (!runtime.credentialPresent && !runtime.enabled) {
      return deny(
        'PROVIDER_NOT_CONFIGURED',
        'Inkling is not configured and is disabled by default. Not trained. Not connected.',
        'NOT_CONFIGURED',
        'NOT_CONFIGURED',
      );
    }
    if (runtime.credentialPresent && !runtime.enabled) {
      return deny(
        'PROVIDER_DISABLED',
        'a configured Inkling weights URI does not enable the provider, is not trained, and is not CONNECTED',
        'BLOCKED',
        'DISABLED',
      );
    }
    if (runtime.enabled && !runtime.credentialPresent) {
      return deny(
        'PROVIDER_NOT_CONFIGURED',
        'Inkling enable flag is set but no server-side weights URI is present',
        'NOT_CONFIGURED',
        'NOT_CONFIGURED',
      );
    }
    return {
      allowed: true,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message:
        'Inkling enable flag and weights URI presence are set; injected health is still required. CONNECTED is not granted. Not trained.',
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
      const response = await this.transport.request(INKLING_CAPABILITY_URL, {
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
    return loadProviderRuntimeConfig('INKLING', this.env);
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

export function createAdapter(options: InklingAdapterOptions = {}): ProviderAdapter {
  return new InklingAdapter(options);
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
        'RESTRICTED data must never leave EARTH through Inkling',
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
