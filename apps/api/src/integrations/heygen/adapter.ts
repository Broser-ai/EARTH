import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../auth/types.js';
import { assertNever } from '../../contracts.js';
import { digestRequest } from '../audit.js';
import { loadProviderRuntimeConfig } from '../config.js';
import { providerOutboundProbe } from '../core/probe.js';
import { evaluateIntegrationPolicy } from '../policy.js';
import {
  type IntegrationDataClassification,
  type IntegrationOperation,
  type IntegrationOperationState,
  type IntegrationPolicyDecision,
  type IntegrationProviderStatus,
  type IntegrationRequest,
  type IntegrationSystemContext,
  type ProviderAdapter,
  type ProviderHealthResult,
  type TenantIntegrationPolicy,
} from '../types.js';
import { validateHeyGenDraftPayload } from './schema.js';
import {
  HEYGEN_DRAFT_REQUEST_URL,
  HEYGEN_HEALTH_URL,
  type HeyGenTransport,
} from './transport.js';

export interface HeyGenAdapterOptions {
  transport?: HeyGenTransport | null;
  env?: NodeJS.ProcessEnv;
  approvalVerified?: boolean;
  tenantPolicy?: TenantIntegrationPolicy | null;
}

export class HeyGenAdapter implements ProviderAdapter {
  readonly providerKey = 'HEYGEN' as const;

  private readonly transport: HeyGenTransport | null;
  private readonly env: NodeJS.ProcessEnv;
  private readonly approvalVerified: boolean;
  private readonly tenantPolicy: TenantIntegrationPolicy | null;
  private lastHealth: ProviderHealthResult | null = null;

  constructor(options: HeyGenAdapterOptions = {}) {
    this.transport = options.transport ?? null;
    this.env = options.env ?? process.env;
    this.approvalVerified = options.approvalVerified ?? false;
    this.tenantPolicy = options.tenantPolicy ?? null;
  }

  async getStatus(_context: TenantContext): Promise<ProviderHealthResult> {
    return this.readHealth(false);
  }

  async checkHealth(_systemContext: IntegrationSystemContext): Promise<ProviderHealthResult> {
    return this.readHealth(true);
  }

  async validateRequest(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationPolicyDecision> {
    if (request.providerKey !== 'HEYGEN') {
      return deny(
        'PROVIDER_NOT_ALLOWLISTED',
        'HeyGen adapter only accepts HEYGEN requests',
        'BLOCKED',
        'DISABLED',
      );
    }

    const payloadDecision = validateHeyGenDraftPayload(request.payload);
    if (!payloadDecision.allowed) {
      return payloadDecision;
    }

    const restricted = classificationGate(request.dataClassification);
    if (restricted) {
      return restricted;
    }

    if (request.operationType !== 'EXECUTIVE_VIDEO_DRAFT_REQUEST') {
      return deny(
        'OPERATION_NOT_SUPPORTED',
        'HeyGen v0.1 only accepts EXECUTIVE_VIDEO_DRAFT_REQUEST',
        'BLOCKED',
        'DISABLED',
      );
    }

    if (request.purpose !== 'EXECUTIVE_VIDEO_DRAFT_REQUEST') {
      return deny(
        'PURPOSE_NOT_ALLOWED',
        'HeyGen v0.1 purpose must be EXECUTIVE_VIDEO_DRAFT_REQUEST',
        'BLOCKED',
        'DISABLED',
      );
    }

    return evaluateIntegrationPolicy({
      role: context.role,
      request,
      runtime: loadProviderRuntimeConfig('HEYGEN', this.env),
      tenantPolicy: this.tenantPolicy,
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: this.approvalVerified,
    });
  }

  async createOperation(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationOperation> {
    const decision = await this.validateRequest(context, request);
    return this.toOperation(context, request, {
      state: decision.resultingState,
      errorCode: decision.allowed ? null : decision.reasonCode,
      safeSummary: honestySummary(decision.message, { includeNotConfigured: true }),
    });
  }

  async executeOperation(
    systemContext: IntegrationSystemContext,
    operation: IntegrationOperation,
  ): Promise<IntegrationOperation> {
    if (!this.isAvailableCached()) {
      return this.withExecuteResult(systemContext, operation, {
        state: 'NOT_CONFIGURED',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        safeSummary: honestySummary(
          'Execute refused. No HeyGen transport call was made.',
          { includeNotConfigured: true },
        ),
        providerJobReference: null,
        responseDigestSha256: null,
      });
    }

    if (!this.approvalVerified) {
      return this.withExecuteResult(systemContext, operation, {
        state: 'REQUESTED',
        errorCode: 'HUMAN_APPROVAL_REQUIRED',
        safeSummary: honestySummary(
          'Durable human approval is required before any HeyGen transport call.',
          { includeNotConfigured: false },
        ),
        providerJobReference: null,
        responseDigestSha256: null,
      });
    }

    if (!this.transport) {
      return this.withExecuteResult(systemContext, operation, {
        state: 'NOT_CONFIGURED',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        safeSummary: honestySummary(
          'Execute refused. Transport is null; no network was used.',
          { includeNotConfigured: true },
        ),
        providerJobReference: null,
        responseDigestSha256: null,
      });
    }

    providerOutboundProbe.record(HEYGEN_DRAFT_REQUEST_URL);
    const response = await this.transport.request(HEYGEN_DRAFT_REQUEST_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        operationId: operation.id,
        briefingDigestSha256: operation.requestDigestSha256,
        draftOnly: true,
        maxCharsMetadata: true,
      }),
    });

    if (response.status !== 200) {
      return this.withExecuteResult(systemContext, operation, {
        state: 'FAILED',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        safeSummary: honestySummary(
          'Draft request transport returned a non-success status. No rendered media. External distribution is disabled.',
          { includeNotConfigured: true },
        ),
        providerJobReference: null,
        responseDigestSha256: null,
      });
    }

    void response.json().catch(() => undefined);

    const receipt = {
      kind: 'heygen-executive-video-draft-request',
      operationId: operation.id,
      draft: true,
      mediaProduced: false,
      autoPublished: false,
    };

    return this.withExecuteResult(systemContext, operation, {
      state: 'SUCCEEDED',
      errorCode: null,
      safeSummary: honestySummary(
        'Draft request receipt only. Human review is required before any later configured execute.',
        { includeNotConfigured: false },
      ),
      providerJobReference: `heygen-draft-request:${operation.id}`,
      responseDigestSha256: digestRequest(receipt),
    });
  }

  async cancelOperation(
    context: TenantContext,
    operationId: string,
  ): Promise<IntegrationOperation> {
    const now = new Date().toISOString();
    return {
      id: operationId,
      organizationId: context.organizationId,
      providerKey: 'HEYGEN',
      operationType: 'EXECUTIVE_VIDEO_DRAFT_REQUEST',
      state: 'CANCELLED',
      idempotencyKey: operationId,
      purpose: 'EXECUTIVE_VIDEO_DRAFT_REQUEST',
      dataClassification: 'INTERNAL',
      requestDigestSha256: null,
      responseDigestSha256: null,
      safeSummary: honestySummary(
        'Cancelled locally. No HeyGen transport call was made. External distribution is disabled.',
        { includeNotConfigured: true },
      ),
      providerJobReference: null,
      requestedBy: context.actorId,
      startedAt: null,
      completedAt: now,
      expiresAt: null,
      errorCode: null,
      correlationId: context.correlationId,
      createdAt: now,
      updatedAt: now,
    };
  }

  private isAvailableCached(): boolean {
    return this.lastHealth?.status === 'AVAILABLE' && this.lastHealth.connected === false;
  }

  private async readHealth(allowProbe: boolean): Promise<ProviderHealthResult> {
    const runtime = loadProviderRuntimeConfig('HEYGEN', this.env);
    const checkedAt = new Date().toISOString();
    const base = {
      providerKey: this.providerKey,
      connected: false as const,
      configured: runtime.credentialPresent,
      enabled: runtime.enabled,
      checkedAt,
    };

    if (!runtime.enabled || !runtime.credentialPresent) {
      const result: ProviderHealthResult = {
        ...base,
        status: 'NOT_CONFIGURED',
        healthy: false,
        reasonCode: runtime.credentialPresent ? 'PROVIDER_DISABLED' : 'PROVIDER_NOT_CONFIGURED',
      };
      this.lastHealth = result;
      return result;
    }

    if (!this.transport || !allowProbe) {
      const result: ProviderHealthResult = {
        ...base,
        status: 'NOT_CONFIGURED',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
      this.lastHealth = result;
      return result;
    }

    providerOutboundProbe.record(HEYGEN_HEALTH_URL);
    try {
      const response = await this.transport.request(HEYGEN_HEALTH_URL, { method: 'GET' });
      const status = statusFromHttp(response.status);
      const result: ProviderHealthResult = {
        ...base,
        status,
        healthy: status === 'AVAILABLE',
        reasonCode:
          status === 'AVAILABLE' ? 'HEYGEN_DRAFT_CAPABILITY_OK' : 'PROVIDER_NOT_CONFIGURED',
      };
      this.lastHealth = result;
      return result;
    } catch {
      const result: ProviderHealthResult = {
        ...base,
        status: 'ERROR',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
      this.lastHealth = result;
      return result;
    }
  }

  private toOperation(
    context: TenantContext,
    request: IntegrationRequest,
    fields: {
      state: IntegrationOperationState;
      errorCode: string | null;
      safeSummary: string;
    },
  ): IntegrationOperation {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      organizationId: context.organizationId,
      providerKey: 'HEYGEN',
      operationType: request.operationType,
      state: fields.state,
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
      safeSummary: fields.safeSummary,
      providerJobReference: null,
      requestedBy: context.actorId,
      startedAt: null,
      completedAt: fields.state === 'BLOCKED' || fields.state === 'NOT_CONFIGURED' ? now : null,
      expiresAt: null,
      errorCode: fields.errorCode,
      correlationId: context.correlationId,
      createdAt: now,
      updatedAt: now,
    };
  }

  private withExecuteResult(
    systemContext: IntegrationSystemContext,
    operation: IntegrationOperation,
    fields: {
      state: IntegrationOperationState;
      errorCode: string | null;
      safeSummary: string;
      providerJobReference: string | null;
      responseDigestSha256: string | null;
    },
  ): IntegrationOperation {
    const now = new Date().toISOString();
    return {
      ...operation,
      state: fields.state,
      errorCode: fields.errorCode,
      safeSummary: fields.safeSummary,
      providerJobReference: fields.providerJobReference,
      responseDigestSha256: fields.responseDigestSha256,
      completedAt: now,
      updatedAt: now,
      correlationId: systemContext.correlationId,
    };
  }
}

function classificationGate(
  classification: IntegrationDataClassification,
): IntegrationPolicyDecision | null {
  switch (classification) {
    case 'RESTRICTED':
      return deny(
        'RESTRICTED_DATA_BLOCKED',
        'RESTRICTED data must never leave EARTH through HeyGen',
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

function statusFromHttp(status: number): IntegrationProviderStatus {
  if (status === 200) {
    return 'AVAILABLE';
  }
  if (status >= 500) {
    return 'ERROR';
  }
  return 'DEGRADED';
}

function honestySummary(message: string, opts: { includeNotConfigured: boolean }): string {
  const marks = ['DRAFT', 'HUMAN_REVIEW_REQUIRED'];
  if (opts.includeNotConfigured) {
    marks.push('NOT_CONFIGURED');
  }
  return `${marks.join('. ')}. ${message} No rendered HeyGen media is produced. External distribution is disabled.`;
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
