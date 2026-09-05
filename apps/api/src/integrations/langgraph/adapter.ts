import { createHash, randomUUID } from 'node:crypto';
import type { TenantContext } from '../../auth/types.js';
import { loadProviderRuntimeConfig } from '../config.js';
import { IntegrationError } from '../core/errors.js';
import { providerOutboundProbe } from '../core/probe.js';
import { findUnsafePayloadField } from '../policy.js';
import type {
  IntegrationOperation,
  IntegrationPolicyDecision,
  IntegrationRequest,
  IntegrationSystemContext,
  ProviderAdapter,
  ProviderHealthResult,
} from '../types.js';
import { buildWorkflowVisualization } from './graph.js';
import {
  defaultPrimeProjectionReader,
  type PrimeProjectionReader,
} from './projection.js';
import { sessionProjectionPayloadSchema } from './schema.js';
import type { LangGraphTransport } from './transport.js';

const CAPABILITY_URL = 'earth://langgraph/capability';
const DRAFT_SUMMARY = 'DRAFT INPUT_UNVERIFIED PRIME workflow visualization. Not a live graph runtime.';

export interface LangGraphAdapterOptions {
  transport?: LangGraphTransport | null;
  projectionReader?: PrimeProjectionReader | null;
  env?: NodeJS.ProcessEnv;
}

export function createAdapter(options: LangGraphAdapterOptions = {}): ProviderAdapter {
  return new LangGraphAdapter(options);
}

class LangGraphAdapter implements ProviderAdapter {
  readonly providerKey = 'LANGGRAPH' as const;
  private readonly transport: LangGraphTransport | null;
  private readonly projectionReader: PrimeProjectionReader;
  private readonly readerInjected: boolean;
  private readonly env: NodeJS.ProcessEnv;

  constructor(options: LangGraphAdapterOptions) {
    this.transport = options.transport ?? null;
    this.readerInjected = options.projectionReader != null;
    this.projectionReader = options.projectionReader ?? defaultPrimeProjectionReader;
    this.env = options.env ?? process.env;
  }

  async getStatus(_context: TenantContext): Promise<ProviderHealthResult> {
    void _context;
    return this.resolveHealth();
  }

  async checkHealth(_systemContext: IntegrationSystemContext): Promise<ProviderHealthResult> {
    void _systemContext;
    return this.resolveHealth();
  }

  async validateRequest(
    _context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationPolicyDecision> {
    void _context;
    const schema = this.validateSchema(request);
    if (!schema.allowed) {
      return schema;
    }
    const health = await this.resolveHealth();
    if (health.status !== 'AVAILABLE') {
      return deny(
        'PROVIDER_NOT_CONFIGURED',
        'LangGraph visualization bridge is not configured. No graph runtime was invoked.',
        'NOT_CONFIGURED',
        'NOT_CONFIGURED',
      );
    }
    return {
      allowed: true,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message: 'Local visualization may run after health succeeds. No live graph runtime is granted.',
      resultingState: 'QUEUED',
      providerStatus: 'AVAILABLE',
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
    const payload = sessionProjectionPayloadSchema.parse(request.payload);
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      organizationId: context.organizationId,
      providerKey: 'LANGGRAPH',
      operationType: 'PRIME_WORKFLOW_PROJECTION',
      state: 'QUEUED',
      idempotencyKey: request.idempotencyKey,
      purpose: 'PRIME_WORKFLOW_PROJECTION',
      dataClassification: request.dataClassification,
      requestDigestSha256: digest({ sessionId: payload.sessionId }),
      responseDigestSha256: null,
      safeSummary: DRAFT_SUMMARY,
      providerJobReference: payload.sessionId,
      requestedBy: context.actorId,
      startedAt: null,
      completedAt: null,
      expiresAt: null,
      errorCode: null,
      correlationId: context.correlationId,
      createdAt: now,
      updatedAt: now,
    };
  }

  async executeOperation(
    _systemContext: IntegrationSystemContext,
    operation: IntegrationOperation,
  ): Promise<IntegrationOperation> {
    void _systemContext;
    const health = await this.resolveHealth();
    if (health.status !== 'AVAILABLE') {
      return {
        ...operation,
        state: 'NOT_CONFIGURED',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        safeSummary: 'Provider is not configured. No PRIME transition and no graph runtime call were made.',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (operation.operationType !== 'PRIME_WORKFLOW_PROJECTION') {
      return {
        ...operation,
        state: 'FAILED',
        errorCode: 'OPERATION_NOT_SUPPORTED',
        safeSummary: 'Only PRIME_WORKFLOW_PROJECTION is supported. No PRIME transition was made.',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const sessionId = operation.providerJobReference;
    if (!sessionId || sessionProjectionPayloadSchema.safeParse({ sessionId }).success === false) {
      return {
        ...operation,
        state: 'FAILED',
        errorCode: 'SCHEMA_VALIDATION_FAILED',
        safeSummary: 'sessionId is required for a read-only projection. No PRIME transition was made.',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const projection = await this.projectionReader.read({
      sessionId,
      organizationId: operation.organizationId,
    });
    if (!projection) {
      return {
        ...operation,
        state: 'FAILED',
        errorCode: 'OPERATION_NOT_FOUND',
        safeSummary: 'No PRIME projection was available. No PRIME transition was made.',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const visualization = buildWorkflowVisualization(projection);
    const encoded = JSON.stringify(visualization);
    const now = new Date().toISOString();
    return {
      ...operation,
      state: 'SUCCEEDED',
      errorCode: null,
      safeSummary: encoded,
      responseDigestSha256: digest(visualization),
      completedAt: now,
      updatedAt: now,
      startedAt: operation.startedAt ?? now,
    };
  }

  async cancelOperation(
    _context: TenantContext,
    _operationId: string,
  ): Promise<IntegrationOperation> {
    void _context;
    void _operationId;
    throw new IntegrationError(
      'PROVIDER_NOT_CONFIGURED',
      'LangGraph visualization has no remote job to cancel',
      400,
    );
  }

  private validateSchema(request: IntegrationRequest): IntegrationPolicyDecision {
    if (request.operationType !== 'PRIME_WORKFLOW_PROJECTION') {
      return deny(
        'OPERATION_NOT_SUPPORTED',
        'operation type is not allow-listed for LANGGRAPH',
        'BLOCKED',
        'DISABLED',
      );
    }
    const unsafe = findUnsafePayloadField(request.payload);
    if (unsafe) {
      return deny(
        'UNSAFE_PAYLOAD_FIELD',
        `payload must not include ${unsafe}`,
        'BLOCKED',
        'DISABLED',
      );
    }
    const parsed = sessionProjectionPayloadSchema.safeParse(request.payload);
    if (!parsed.success) {
      return deny(
        'SCHEMA_VALIDATION_FAILED',
        'payload must be { sessionId } as a UUID and nothing else',
        'BLOCKED',
        'NOT_CONFIGURED',
      );
    }
    return {
      allowed: true,
      reasonCode: 'PROVIDER_NOT_CONFIGURED',
      message: 'schema ok',
      resultingState: 'REQUESTED',
      providerStatus: 'NOT_CONFIGURED',
    };
  }

  private async resolveHealth(): Promise<ProviderHealthResult> {
    const runtime = loadProviderRuntimeConfig('LANGGRAPH', this.env);
    const base = {
      providerKey: this.providerKey,
      configured: runtime.credentialPresent,
      enabled: runtime.enabled,
      connected: false as const,
      checkedAt: new Date().toISOString(),
    };

    if (!runtime.enabled || !runtime.credentialPresent) {
      return {
        ...base,
        status: 'NOT_CONFIGURED',
        healthy: false,
        reasonCode: 'PROVIDER_NOT_CONFIGURED',
      };
    }

    if (!this.readerInjected) {
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
      providerOutboundProbe.record(CAPABILITY_URL);
      const response = await this.transport.request(CAPABILITY_URL, { method: 'GET' });
      if (response.status !== 200) {
        return {
          ...base,
          status: 'DEGRADED',
          healthy: false,
          reasonCode: 'PROVIDER_NOT_CONFIGURED',
        };
      }
      const body = await response.json();
      if (!isVisualizationCapability(body)) {
        return {
          ...base,
          status: 'NOT_CONFIGURED',
          healthy: false,
          reasonCode: 'PROVIDER_NOT_CONFIGURED',
        };
      }
      return {
        ...base,
        status: 'AVAILABLE',
        healthy: true,
        reasonCode: 'WORKFLOW_PROJECTION_READY',
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
}

function isVisualizationCapability(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }
  const record = body as Record<string, unknown>;
  if (record.ok !== true) {
    return false;
  }
  if (record.capability !== 'PRIME_WORKFLOW_PROJECTION') {
    return false;
  }
  if (record.llm === true) {
    return false;
  }
  return true;
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

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
