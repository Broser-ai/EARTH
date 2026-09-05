import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../auth/types.js';
import { assertNever } from '../../contracts.js';
import { digestRequest } from '../audit.js';
import { loadProviderRuntimeConfig } from '../config.js';
import { IntegrationError } from '../core/errors.js';
import { providerOutboundProbe } from '../core/probe.js';
import { assertNoSecretMaterial } from '../core/secrets.js';
import type {
  IntegrationOperation,
  IntegrationPolicyDecision,
  IntegrationRequest,
  IntegrationSystemContext,
  ProviderAdapter,
  ProviderHealthResult,
  ProviderRuntimeConfig,
} from '../types.js';
import {
  assertRoboflowDraftStatus,
  draftStatusFromConfidence,
  isCapabilityBody,
  parseInferenceBody,
  validateInferencePayload,
  type RoboflowDraftResult,
} from './schema.js';
import {
  ROBOFLOW_HEALTH_URL,
  ROBOFLOW_INFER_URL,
  type RoboflowTransport,
} from './transport.js';

export interface RoboflowAdapterOptions {
  transport?: RoboflowTransport;
}

interface StoredOperation {
  operation: IntegrationOperation;
  payload: Record<string, unknown>;
}

export class RoboflowAdapter implements ProviderAdapter {
  readonly providerKey = 'ROBOFLOW' as const;
  private readonly transport: RoboflowTransport | null;
  private readonly operations = new Map<string, StoredOperation>();

  constructor(options: RoboflowAdapterOptions = {}) {
    this.transport = options.transport ?? null;
  }

  async getStatus(_context: TenantContext): Promise<ProviderHealthResult> {
    return this.resolveHealth();
  }

  async checkHealth(_systemContext: IntegrationSystemContext): Promise<ProviderHealthResult> {
    return this.resolveHealth();
  }

  async validateRequest(
    _context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationPolicyDecision> {
    if (request.providerKey !== 'ROBOFLOW') {
      return deny(
        'PROVIDER_NOT_ALLOWLISTED',
        'this adapter only serves ROBOFLOW',
        'BLOCKED',
        'DISABLED',
      );
    }

    if (
      request.operationType !== 'MATERIAL_IMAGE_INFERENCE' ||
      request.purpose !== 'MATERIAL_IMAGE_INFERENCE'
    ) {
      return deny(
        'OPERATION_NOT_SUPPORTED',
        'ROBOFLOW v0.1 only accepts MATERIAL_IMAGE_INFERENCE',
        'BLOCKED',
        'DISABLED',
      );
    }

    switch (request.dataClassification) {
      case 'RESTRICTED':
        return deny(
          'RESTRICTED_DATA_BLOCKED',
          'RESTRICTED data must never leave EARTH through an external provider',
          'BLOCKED',
          'DISABLED',
        );
      case 'CONFIDENTIAL':
        return deny(
          'CONFIDENTIAL_OUTBOUND_FORBIDDEN',
          'CONFIDENTIAL data requires an explicit tenant outbound-data policy evaluated by the control plane',
          'BLOCKED',
          'DISABLED',
        );
      case 'PUBLIC':
      case 'INTERNAL':
        break;
      default:
        return assertNever(request.dataClassification);
    }

    const payloadGate = validateInferencePayload(request.payload);
    if (!payloadGate.ok) {
      return deny(payloadGate.reasonCode, payloadGate.message, 'BLOCKED', 'DISABLED');
    }

    const runtime = loadProviderRuntimeConfig('ROBOFLOW');
    const runtimeGate = evaluateRuntime(runtime);
    if (!runtimeGate.allowed) {
      return runtimeGate;
    }

    return {
      allowed: true,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message:
        'payload accepted as image metadata only. CONNECTED is not granted. Results stay DRAFT / INPUT_UNVERIFIED.',
      resultingState: 'REQUESTED',
      providerStatus: 'NOT_CONFIGURED',
    };
  }

  async createOperation(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationOperation> {
    const decision = await this.validateRequest(context, request);
    if (!decision.allowed) {
      throw new IntegrationError(decision.reasonCode, decision.message, 400);
    }

    const now = new Date().toISOString();
    const operation: IntegrationOperation = {
      id: randomUUID(),
      organizationId: context.organizationId,
      providerKey: 'ROBOFLOW',
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
      errorCode: null,
      correlationId: context.correlationId,
      createdAt: now,
      updatedAt: now,
    };
    assertSafe(operation);
    this.operations.set(operation.id, { operation, payload: request.payload });
    return operation;
  }

  async executeOperation(
    systemContext: IntegrationSystemContext,
    operation: IntegrationOperation,
  ): Promise<IntegrationOperation> {
    const existing = this.operations.get(operation.id)?.operation ?? operation;
    if (existing.state === 'CANCELLED') {
      return existing;
    }

    const health = await this.checkHealth(systemContext);
    if (health.status !== 'AVAILABLE') {
      return this.finish(existing, notConfiguredDraft(existing.id));
    }

    const stored = this.operations.get(operation.id);
    const payload = stored?.payload;
    if (!payload) {
      return this.finish(operation, notConfiguredDraft(operation.id));
    }

    const parsed = validateInferencePayload(payload);
    if (!parsed.ok) {
      return this.finish(
        operation,
        notConfiguredDraft(operation.id),
        'FAILED',
        parsed.reasonCode,
      );
    }

    if (!this.transport) {
      return this.finish(operation, notConfiguredDraft(operation.id));
    }

    try {
      await this.callTransport(parsed.value.objectStorageRef, { method: 'GET' });
      const infer = await this.callTransport(ROBOFLOW_INFER_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          objectStorageRef: parsed.value.objectStorageRef,
          byteLength: parsed.value.byteLength,
        }),
      });
      const body = await infer.json();
      assertSafe(body);
      const inferred = parseInferenceBody(body);
      const status = assertRoboflowDraftStatus(
        draftStatusFromConfidence(
          inferred.confidence,
          parsed.value.confidenceThreshold,
          inferred.labels,
        ),
      );
      const draft: RoboflowDraftResult = {
        labels: inferred.labels,
        confidence: inferred.confidence,
        modelVersion: inferred.modelVersion,
        operationId: operation.id,
        status,
      };
      return this.finish(operation, draft, 'SUCCEEDED', null);
    } catch {
      return this.finish(operation, notConfiguredDraft(operation.id), 'FAILED', 'PROVIDER_NOT_CONFIGURED');
    }
  }

  async cancelOperation(
    _context: TenantContext,
    operationId: string,
  ): Promise<IntegrationOperation> {
    const stored = this.operations.get(operationId);
    if (!stored) {
      throw new IntegrationError('OPERATION_NOT_FOUND', 'operation not found for this adapter', 404);
    }
    const cancelled: IntegrationOperation = {
      ...stored.operation,
      state: 'CANCELLED',
      safeSummary: 'Cancelled before any provider execution. No external call was made.',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assertSafe(cancelled);
    this.operations.set(operationId, { ...stored, operation: cancelled });
    return cancelled;
  }

  private async resolveHealth(): Promise<ProviderHealthResult> {
    const runtime = loadProviderRuntimeConfig('ROBOFLOW');
    const checkedAt = new Date().toISOString();

    if (!runtime.enabled || !runtime.credentialPresent) {
      const reasonCode =
        runtime.credentialPresent && !runtime.enabled
          ? 'PROVIDER_DISABLED'
          : 'PROVIDER_NOT_CONFIGURED';
      return sanitizeHealth({
        providerKey: 'ROBOFLOW',
        status: 'NOT_CONFIGURED',
        configured: runtime.credentialPresent,
        enabled: runtime.enabled,
        healthy: false,
        connected: false,
        reasonCode,
        checkedAt,
      });
    }

    if (!this.transport) {
      return sanitizeHealth({
        providerKey: 'ROBOFLOW',
        status: 'NOT_CONFIGURED',
        configured: true,
        enabled: true,
        healthy: false,
        connected: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
        checkedAt,
      });
    }

    try {
      const response = await this.callTransport(ROBOFLOW_HEALTH_URL, {
        method: 'GET',
        headers: { accept: 'application/json' },
      });
      if (response.status === 200) {
        const body = await response.json();
        assertSafe(body);
        if (isCapabilityBody(body)) {
          return sanitizeHealth({
            providerKey: 'ROBOFLOW',
            status: 'AVAILABLE',
            configured: true,
            enabled: true,
            healthy: true,
            connected: false,
            reasonCode: 'HEALTH_OK',
            checkedAt,
          });
        }
        return sanitizeHealth({
          providerKey: 'ROBOFLOW',
          status: 'DEGRADED',
          configured: true,
          enabled: true,
          healthy: false,
          connected: false,
          reasonCode: 'HEALTH_CHECK_FAILED',
          checkedAt,
        });
      }
      if (response.status >= 500) {
        return sanitizeHealth({
          providerKey: 'ROBOFLOW',
          status: 'ERROR',
          configured: true,
          enabled: true,
          healthy: false,
          connected: false,
          reasonCode: 'HEALTH_CHECK_FAILED',
          checkedAt,
        });
      }
      return sanitizeHealth({
        providerKey: 'ROBOFLOW',
        status: 'DEGRADED',
        configured: true,
        enabled: true,
        healthy: false,
        connected: false,
        reasonCode: 'HEALTH_CHECK_FAILED',
        checkedAt,
      });
    } catch {
      return sanitizeHealth({
        providerKey: 'ROBOFLOW',
        status: 'ERROR',
        configured: true,
        enabled: true,
        healthy: false,
        connected: false,
        reasonCode: 'HEALTH_CHECK_FAILED',
        checkedAt,
      });
    }
  }

  private async callTransport(
    url: string,
    init: RequestInit,
  ): Promise<{ status: number; json(): Promise<unknown> }> {
    if (!this.transport) {
      throw new Error('transport is not configured');
    }
    providerOutboundProbe.record(url);
    assertSafe(init);
    return this.transport.request(url, init);
  }

  private finish(
    operation: IntegrationOperation,
    draft: RoboflowDraftResult,
    state: IntegrationOperation['state'] = 'NOT_CONFIGURED',
    errorCode: string | null = state === 'NOT_CONFIGURED' ? 'PROVIDER_NOT_CONFIGURED' : null,
  ): IntegrationOperation {
    const now = new Date().toISOString();
    const next: IntegrationOperation = {
      ...operation,
      state,
      errorCode,
      safeSummary: JSON.stringify(draft),
      responseDigestSha256: digestRequest(draft),
      completedAt: now,
      updatedAt: now,
    };
    assertSafe(next);
    const stored = this.operations.get(operation.id);
    if (stored) {
      this.operations.set(operation.id, { ...stored, operation: next });
    }
    return next;
  }
}

function evaluateRuntime(runtime: ProviderRuntimeConfig): IntegrationPolicyDecision {
  if (!runtime.credentialPresent && !runtime.enabled) {
    return deny(
      'PROVIDER_NOT_CONFIGURED',
      'provider is not configured and is disabled by default',
      'NOT_CONFIGURED',
      'NOT_CONFIGURED',
    );
  }
  if (runtime.credentialPresent && !runtime.enabled) {
    return deny(
      'PROVIDER_DISABLED',
      'a configured credential does not enable the provider. CONNECTED is not granted.',
      'BLOCKED',
      'DISABLED',
    );
  }
  if (runtime.enabled && !runtime.credentialPresent) {
    return deny(
      'PROVIDER_NOT_CONFIGURED',
      'enable flag is set but no server-side credential is present',
      'NOT_CONFIGURED',
      'NOT_CONFIGURED',
    );
  }
  return {
    allowed: true,
    reasonCode: 'PROVIDER_NOT_CONFIGURED',
    message:
      'server credential and enable flag are present; a successful injected health check is still required. CONNECTED is not granted.',
    resultingState: 'REQUESTED',
    providerStatus: 'NOT_CONFIGURED',
  };
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

function notConfiguredDraft(operationId: string): RoboflowDraftResult {
  return {
    labels: [],
    confidence: 0,
    modelVersion: 'none',
    operationId,
    status: 'NOT_CONFIGURED',
  };
}

function sanitizeHealth(result: ProviderHealthResult): ProviderHealthResult {
  assertSafe(result);
  return { ...result, connected: false };
}

function assertSafe(value: unknown): void {
  assertNoSecretMaterial(value);
  const text = JSON.stringify(value) ?? '';
  if (text.includes('"connected":true') || text.includes('"status":"CONNECTED"') || text.includes('"status":"VERIFIED"')) {
    throw new Error('adapter must never emit CONNECTED or VERIFIED');
  }
}

export function createAdapter(options?: RoboflowAdapterOptions): ProviderAdapter {
  return new RoboflowAdapter(options);
}
