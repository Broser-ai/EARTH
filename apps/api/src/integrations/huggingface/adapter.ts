import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../auth/types.js';
import { assertNever } from '../../contracts.js';
import { digestRequest } from '../audit.js';
import { loadProviderRuntimeConfig } from '../config.js';
import { IntegrationError } from '../core/errors.js';
import { providerOutboundProbe } from '../core/probe.js';
import { findUnsafePayloadField } from '../policy.js';
import {
  type IntegrationOperation,
  type IntegrationPolicyDecision,
  type IntegrationRequest,
  type IntegrationSystemContext,
  type ProviderAdapter,
  type ProviderHealthResult,
} from '../types.js';
import {
  findHuggingFaceUnsafeField,
  isAllowListedModelId,
  sanitizeAllowListedModelIds,
} from './allowlist.js';
import {
  catalogPayloadSchema,
  inferencePayloadSchema,
  isHuggingFaceOperationType,
  type HuggingFaceOperationType,
} from './schema.js';
import {
  huggingFaceHealthUrl,
  huggingFaceHubModelApiUrl,
  isHuggingFaceHubApiUrl,
  type HuggingFaceTransport,
} from './transport.js';

const CATALOG_REF_PREFIX = 'hf:catalog:';
const INFERENCE_REF_PREFIX = 'hf:inference:';

export interface HuggingFaceAdapterOptions {
  transport?: HuggingFaceTransport | null;
  allowListedModelIds?: readonly string[];
}

export class HuggingFaceAdapter implements ProviderAdapter {
  readonly providerKey = 'HUGGINGFACE' as const;
  private readonly transport: HuggingFaceTransport | null;
  private readonly allowListedModelIds: readonly string[];
  private readonly operations = new Map<string, IntegrationOperation>();

  constructor(options: HuggingFaceAdapterOptions = {}) {
    this.transport = options.transport ?? null;
    this.allowListedModelIds = sanitizeAllowListedModelIds(options.allowListedModelIds);
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
    return this.evaluateRequest(request);
  }

  async createOperation(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationOperation> {
    const decision = this.evaluateRequest(request);
    if (!decision.allowed) {
      throw new IntegrationError(decision.reasonCode, decision.message, 400);
    }

    const parsed = this.parseApprovedPayload(request);
    const health = await this.resolveHealth({ probe: false });
    const now = new Date().toISOString();
    const operation: IntegrationOperation = {
      id: randomUUID(),
      organizationId: context.organizationId,
      providerKey: 'HUGGINGFACE',
      operationType: request.operationType,
      state: health.status === 'AVAILABLE' ? 'QUEUED' : 'NOT_CONFIGURED',
      idempotencyKey: request.idempotencyKey,
      purpose: request.purpose,
      dataClassification: request.dataClassification,
      requestDigestSha256: digestRequest({
        providerKey: request.providerKey,
        operationType: request.operationType,
        purpose: request.purpose,
        dataClassification: request.dataClassification,
        idempotencyKey: request.idempotencyKey,
        modelId: parsed.modelId,
      }),
      responseDigestSha256: null,
      safeSummary: decision.message,
      providerJobReference: toJobReference(parsed.operationType, parsed.modelId),
      requestedBy: context.actorId,
      startedAt: null,
      completedAt: health.status === 'AVAILABLE' ? null : now,
      expiresAt: null,
      errorCode: health.status === 'AVAILABLE' ? null : 'PROVIDER_NOT_CONFIGURED',
      correlationId: context.correlationId,
      createdAt: now,
      updatedAt: now,
    };
    this.operations.set(operation.id, operation);
    return operation;
  }

  async executeOperation(
    systemContext: IntegrationSystemContext,
    operation: IntegrationOperation,
  ): Promise<IntegrationOperation> {
    const health = await this.checkHealth(systemContext);
    if (health.status !== 'AVAILABLE') {
      return this.persist({
        ...operation,
        state: 'NOT_CONFIGURED',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        safeSummary: 'Hugging Face adapter is not AVAILABLE. No provider call was made.',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const parsedRef = parseJobReference(operation.providerJobReference);
    if (!parsedRef || !isAllowListedModelId(parsedRef.modelId, this.allowListedModelIds)) {
      return this.persist({
        ...operation,
        state: 'FAILED',
        errorCode: 'SCHEMA_VALIDATION_FAILED',
        safeSummary: 'Allow-listed model id is required. No provider call was made.',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    switch (parsedRef.kind) {
      case 'catalog':
        return this.executeCatalog(operation, parsedRef.modelId);
      case 'inference':
        return this.executeInference(operation, parsedRef.modelId);
      default:
        return assertNever(parsedRef.kind);
    }
  }

  async cancelOperation(
    context: TenantContext,
    operationId: string,
  ): Promise<IntegrationOperation> {
    const existing = this.operations.get(operationId);
    if (!existing || existing.organizationId !== context.organizationId) {
      throw new IntegrationError('OPERATION_NOT_FOUND', 'operation not found for this organization', 404);
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
    const now = new Date().toISOString();
    return this.persist({
      ...existing,
      state: 'CANCELLED',
      safeSummary: 'Cancelled locally. No Hugging Face call was made.',
      completedAt: now,
      updatedAt: now,
    });
  }

  private evaluateRequest(request: IntegrationRequest): IntegrationPolicyDecision {
    if (request.providerKey !== 'HUGGINGFACE' || !isHuggingFaceOperationType(request.operationType)) {
      return deny(
        'OPERATION_NOT_SUPPORTED',
        'operation type is not allow-listed for Hugging Face',
        'BLOCKED',
        'DISABLED',
      );
    }

    if (request.dataClassification === 'RESTRICTED') {
      return deny(
        'RESTRICTED_DATA_BLOCKED',
        'RESTRICTED data must never leave EARTH through Hugging Face',
        'BLOCKED',
        'DISABLED',
      );
    }

    const policyUnsafe = findUnsafePayloadField(request.payload);
    if (policyUnsafe) {
      return deny(
        'UNSAFE_PAYLOAD_FIELD',
        `payload must not include ${policyUnsafe}`,
        'BLOCKED',
        'DISABLED',
      );
    }

    const hfUnsafe = findHuggingFaceUnsafeField(request.payload);
    if (hfUnsafe) {
      return deny(
        'UNSAFE_PAYLOAD_FIELD',
        'payload must not include URLs, traversal, file URIs, hosts, or secret-like text',
        'BLOCKED',
        'DISABLED',
      );
    }

    const parsed = parsePayload(request.operationType, request.payload);
    if (!parsed.ok) {
      return deny('SCHEMA_VALIDATION_FAILED', parsed.message, 'BLOCKED', 'NOT_CONFIGURED');
    }

    if (!isAllowListedModelId(parsed.modelId, this.allowListedModelIds)) {
      return deny(
        'SCHEMA_VALIDATION_FAILED',
        'modelId is not on the server allow-list',
        'BLOCKED',
        'DISABLED',
      );
    }

    return {
      allowed: true,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message: 'schema ok; provider remains unavailable until enable, credential, and health succeed',
      resultingState: 'REQUESTED',
      providerStatus: 'NOT_CONFIGURED',
    };
  }

  private parseApprovedPayload(request: IntegrationRequest): {
    operationType: HuggingFaceOperationType;
    modelId: string;
  } {
    if (!isHuggingFaceOperationType(request.operationType)) {
      throw new IntegrationError('OPERATION_NOT_SUPPORTED', 'unsupported Hugging Face operation', 400);
    }
    const parsed = parsePayload(request.operationType, request.payload);
    if (!parsed.ok) {
      throw new IntegrationError('SCHEMA_VALIDATION_FAILED', parsed.message, 400);
    }
    return { operationType: request.operationType, modelId: parsed.modelId };
  }

  private async resolveHealth(options: { probe: boolean } = { probe: true }): Promise<ProviderHealthResult> {
    const runtime = loadProviderRuntimeConfig('HUGGINGFACE');
    const checkedAt = new Date().toISOString();
    const base = {
      providerKey: this.providerKey,
      configured: runtime.credentialPresent,
      enabled: runtime.enabled,
      connected: false as const,
      checkedAt,
    };

    if (!runtime.enabled || !runtime.credentialPresent) {
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
        status: 'DEGRADED',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }

    if (!options.probe) {
      return {
        ...base,
        status: 'DEGRADED',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }

    const url = huggingFaceHealthUrl();
    if (!isHuggingFaceHubApiUrl(url)) {
      return {
        ...base,
        status: 'ERROR',
        healthy: false,
        reasonCode: 'UNSAFE_PAYLOAD_FIELD',
      };
    }

    try {
      providerOutboundProbe.record(url);
      const response = await this.transport.request(url, { method: 'GET' });
      const body = await response.json();
      if (response.status === 200 && isCapabilityBody(body)) {
        return {
          ...base,
          status: 'AVAILABLE',
          healthy: true,
          reasonCode: 'HEALTH_OK',
        };
      }
      return {
        ...base,
        status: 'DEGRADED',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
    } catch {
      return {
        ...base,
        status: 'ERROR',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }
  }

  private async executeCatalog(
    operation: IntegrationOperation,
    modelId: string,
  ): Promise<IntegrationOperation> {
    if (!this.transport) {
      return this.unavailable(operation);
    }
    const url = huggingFaceHubModelApiUrl(modelId);
    if (!isHuggingFaceHubApiUrl(url) || url.includes('..')) {
      return this.persist({
        ...operation,
        state: 'FAILED',
        errorCode: 'UNSAFE_PAYLOAD_FIELD',
        safeSummary: 'Refused non-allow-listed Hugging Face URL. No provider call was made.',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    providerOutboundProbe.record(url);
    const response = await this.transport.request(url, { method: 'GET' });
    const body = await response.json();
    const now = new Date().toISOString();
    return this.persist({
      ...operation,
      state: 'SUCCEEDED',
      errorCode: null,
      responseDigestSha256: digestRequest(body),
      providerJobReference: toJobReference('MODEL_CATALOG_LOOKUP', modelId),
      safeSummary:
        'DRAFT catalog lookup. Metadata is unverified external data. Does not create claims.',
      startedAt: operation.startedAt ?? now,
      completedAt: now,
      updatedAt: now,
    });
  }

  private executeInference(operation: IntegrationOperation, modelId: string): IntegrationOperation {
    const now = new Date().toISOString();
    return this.persist({
      ...operation,
      state: 'SUCCEEDED',
      errorCode: null,
      responseDigestSha256: digestRequest({ modelId, kind: 'inference-job-request' }),
      providerJobReference: toJobReference('APPROVED_INFERENCE_REQUEST', modelId),
      safeSummary: 'DRAFT inference job request. Digest-only input. No model output was produced.',
      startedAt: operation.startedAt ?? now,
      completedAt: now,
      updatedAt: now,
    });
  }

  private unavailable(operation: IntegrationOperation): IntegrationOperation {
    const now = new Date().toISOString();
    return this.persist({
      ...operation,
      state: 'NOT_CONFIGURED',
      errorCode: 'PROVIDER_NOT_CONFIGURED',
      safeSummary: 'Hugging Face adapter is not AVAILABLE. No provider call was made.',
      completedAt: now,
      updatedAt: now,
    });
  }

  private persist(operation: IntegrationOperation): IntegrationOperation {
    this.operations.set(operation.id, operation);
    return operation;
  }
}

function parsePayload(
  operationType: HuggingFaceOperationType,
  payload: Record<string, unknown>,
): { ok: true; modelId: string } | { ok: false; message: string } {
  switch (operationType) {
    case 'MODEL_CATALOG_LOOKUP': {
      const parsed = catalogPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return { ok: false, message: parsed.error.issues[0]?.message ?? 'invalid catalog payload' };
      }
      return { ok: true, modelId: parsed.data.modelId };
    }
    case 'APPROVED_INFERENCE_REQUEST': {
      const parsed = inferencePayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return { ok: false, message: parsed.error.issues[0]?.message ?? 'invalid inference payload' };
      }
      return { ok: true, modelId: parsed.data.modelId };
    }
    default:
      return assertNever(operationType);
  }
}

function toJobReference(operationType: HuggingFaceOperationType, modelId: string): string {
  switch (operationType) {
    case 'MODEL_CATALOG_LOOKUP':
      return `${CATALOG_REF_PREFIX}${modelId}`;
    case 'APPROVED_INFERENCE_REQUEST':
      return `${INFERENCE_REF_PREFIX}${modelId}`;
    default:
      return assertNever(operationType);
  }
}

function parseJobReference(
  reference: string | null,
): { kind: 'catalog' | 'inference'; modelId: string } | null {
  if (!reference) {
    return null;
  }
  if (reference.startsWith(CATALOG_REF_PREFIX)) {
    return { kind: 'catalog', modelId: reference.slice(CATALOG_REF_PREFIX.length) };
  }
  if (reference.startsWith(INFERENCE_REF_PREFIX)) {
    return { kind: 'inference', modelId: reference.slice(INFERENCE_REF_PREFIX.length) };
  }
  return null;
}

function isCapabilityBody(body: unknown): boolean {
  if (body === null || typeof body !== 'object') {
    return false;
  }
  if (Array.isArray(body)) {
    return true;
  }
  const record = body as Record<string, unknown>;
  return typeof record.error !== 'string';
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
