import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../src/auth/types.js';
import { assertNever } from '../../src/contracts.js';
import { IntegrationError } from '../../src/integrations/core/errors.js';
import { providerOutboundProbe } from '../../src/integrations/core/probe.js';
import { findUnsafePayloadField } from '../../src/integrations/policy.js';
import {
  type IntegrationOperation,
  type IntegrationPolicyDecision,
  type IntegrationProviderKey,
  type IntegrationRequest,
  type IntegrationSystemContext,
  type ProviderAdapter,
  type ProviderHealthResult,
} from '../../src/integrations/types.js';

export interface MockTransport {
  fetch: typeof fetch;
}

export interface MockAdapterOptions {
  transport?: MockTransport | null;
  enabled?: boolean;
  credentialPresent?: boolean;
  healthOk?: boolean;
  projectionGuard?: PrimeProjectionGuard;
}

export interface PrimeProjectionGuard {
  reads: number;
  writes: number;
  read(): Record<string, unknown>;
  write(_patch: Record<string, unknown>): void;
  reset(): void;
}

export const HF_MODEL_ALLOWLIST = ['earth-internal/material-classifier'] as const;
export const ROBOFLOW_CONFIDENCE_FLOOR = 0.85;

export type RoboflowReviewDecision =
  | { outcome: 'ABSTAINED'; reason: 'REQUIRES_HUMAN_REVIEW'; claimStatus: 'INPUT_UNVERIFIED' }
  | { outcome: 'DRAFT'; reason: 'INPUT_UNVERIFIED'; claimStatus: 'INPUT_UNVERIFIED' };

export function createPrimeProjectionGuard(): PrimeProjectionGuard {
  return {
    reads: 0,
    writes: 0,
    read() {
      this.reads += 1;
      return { kind: 'PRIME_WORKFLOW_PROJECTION', draft: true, verified: false };
    },
    write(_patch: Record<string, unknown>): void {
      void _patch;
      this.writes += 1;
    },
    reset() {
      this.reads = 0;
      this.writes = 0;
    },
  };
}

export function roboflowReviewDecision(confidence: number): RoboflowReviewDecision {
  if (confidence < ROBOFLOW_CONFIDENCE_FLOOR) {
    return { outcome: 'ABSTAINED', reason: 'REQUIRES_HUMAN_REVIEW', claimStatus: 'INPUT_UNVERIFIED' };
  }
  return { outcome: 'DRAFT', reason: 'INPUT_UNVERIFIED', claimStatus: 'INPUT_UNVERIFIED' };
}

export function isAllowlistedHfModel(modelId: unknown): boolean {
  if (typeof modelId !== 'string' || modelId.trim().length === 0) {
    return false;
  }
  if (/^https?:\/\//i.test(modelId) || modelId.includes('..') || modelId.includes('\\')) {
    return false;
  }
  return (HF_MODEL_ALLOWLIST as readonly string[]).includes(modelId);
}

export function tinkerInklingJobContract(): { trained: false; completed: false; intentOnly: true } {
  return { trained: false, completed: false, intentOnly: true };
}

export function heygenPublishDecision(): { published: false; autoPublish: false; status: 'DRAFT' } {
  return { published: false, autoPublish: false, status: 'DRAFT' };
}

export function createMockAdapter(
  providerKey: IntegrationProviderKey,
  options: MockAdapterOptions = {},
): ProviderAdapter {
  switch (providerKey) {
    case 'ROBOFLOW':
      return new MockRoboflowAdapter(options);
    case 'HUGGINGFACE':
      return new MockHuggingFaceAdapter(options);
    case 'TINKER':
      return new MockTinkerAdapter(options);
    case 'INKLING':
      return new MockInklingAdapter(options);
    case 'HEYGEN':
      return new MockHeyGenAdapter(options);
    case 'LANGGRAPH':
      return new MockLangGraphAdapter(options);
    default:
      return assertNever(providerKey);
  }
}

const PROVIDER_FOLDERS: Record<IntegrationProviderKey, string> = {
  ROBOFLOW: 'roboflow',
  HUGGINGFACE: 'huggingface',
  TINKER: 'tinker',
  INKLING: 'inkling',
  HEYGEN: 'heygen',
  LANGGRAPH: 'langgraph',
};

export async function loadContractAdapter(
  providerKey: IntegrationProviderKey,
  options: MockAdapterOptions = {},
): Promise<{ adapter: ProviderAdapter; source: 'real' | 'mock' }> {
  const folder = PROVIDER_FOLDERS[providerKey];
  try {
    const mod = (await import(`../../src/integrations/${folder}/index.js`)) as {
      createAdapter?: () => ProviderAdapter;
    };
    if (typeof mod.createAdapter === 'function') {
      return { adapter: mod.createAdapter(), source: 'real' };
    }
  } catch {
    // Adapter folders are empty on this SHA; mocks still prove the contract.
  }
  return { adapter: createMockAdapter(providerKey, options), source: 'mock' };
}

abstract class BaseMockAdapter implements ProviderAdapter {
  abstract readonly providerKey: IntegrationProviderKey;
  protected lastPayload: Record<string, unknown> = {};

  constructor(protected readonly options: MockAdapterOptions) {}

  async getStatus(_context: TenantContext): Promise<ProviderHealthResult> {
    return this.health();
  }

  async checkHealth(_systemContext: IntegrationSystemContext): Promise<ProviderHealthResult> {
    await this.maybeProbe('health');
    return this.health();
  }

  async validateRequest(
    _context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationPolicyDecision> {
    this.lastPayload = request.payload;
    const blocked = this.commonDeny(request);
    if (blocked) {
      return blocked;
    }
    return this.adapterValidate(request);
  }

  async createOperation(
    _context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationOperation> {
    this.lastPayload = request.payload;
    if (this.health().status !== 'AVAILABLE') {
      throw new IntegrationError(
        'PROVIDER_NOT_CONFIGURED',
        'mock adapter will not create a provider-side job while health is not AVAILABLE',
        400,
      );
    }
    const extra = this.commonDeny(request) ?? (await this.adapterValidate(request));
    if (!extra.allowed) {
      return this.operationFrom(request, extra.resultingState, extra.reasonCode, extra.message);
    }
    return this.operationFrom(request, 'REQUESTED', null, 'local draft operation; no provider HTTP');
  }

  async executeOperation(
    _systemContext: IntegrationSystemContext,
    operation: IntegrationOperation,
  ): Promise<IntegrationOperation> {
    if (this.health().status !== 'AVAILABLE') {
      return {
        ...operation,
        state: 'NOT_CONFIGURED',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        safeSummary: 'Provider is not configured. No external call was made.',
        completedAt: new Date().toISOString(),
      };
    }
    await this.maybeProbe('execute');
    return this.adapterExecute(operation);
  }

  async cancelOperation(
    _context: TenantContext,
    _operationId: string,
  ): Promise<IntegrationOperation> {
    throw new IntegrationError(
      'PROVIDER_NOT_CONFIGURED',
      'mock adapters have no remote job to cancel',
      400,
    );
  }

  protected abstract adapterValidate(request: IntegrationRequest): Promise<IntegrationPolicyDecision>;
  protected abstract adapterExecute(operation: IntegrationOperation): Promise<IntegrationOperation>;

  protected health(): ProviderHealthResult {
    const configured = Boolean(this.options.credentialPresent);
    const enabled = Boolean(this.options.enabled);
    const healthy = Boolean(this.options.healthOk) && configured && enabled;
    if (!healthy) {
      return {
        providerKey: this.providerKey,
        status: configured && !enabled ? 'DISABLED' : 'NOT_CONFIGURED',
        configured,
        enabled,
        healthy: false,
        connected: false,
        reasonCode: configured && !enabled ? 'PROVIDER_DISABLED' : 'PROVIDER_NOT_CONFIGURED',
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      providerKey: this.providerKey,
      status: 'AVAILABLE',
      configured: true,
      enabled: true,
      healthy: true,
      connected: false,
      reasonCode: 'CONNECTED_STATUS_FORBIDDEN',
      checkedAt: new Date().toISOString(),
    };
  }

  protected commonDeny(request: IntegrationRequest): IntegrationPolicyDecision | null {
    const unsafe = findUnsafePayloadField(request.payload);
    if (unsafe) {
      return deny('UNSAFE_PAYLOAD_FIELD', `payload must not include ${unsafe}`, 'BLOCKED');
    }
    if (request.dataClassification === 'RESTRICTED') {
      return deny(
        'RESTRICTED_DATA_BLOCKED',
        'RESTRICTED data must never leave EARTH through an external provider',
        'BLOCKED',
      );
    }
    if (hasUnsafeUrlValue(request.payload)) {
      return deny('UNSAFE_PAYLOAD_FIELD', 'payload must not include arbitrary https URLs', 'BLOCKED');
    }
    return null;
  }

  protected allowValidate(): IntegrationPolicyDecision {
    const health = this.health();
    if (health.status !== 'AVAILABLE') {
      return deny('PROVIDER_NOT_CONFIGURED', 'mock adapter is not available', 'NOT_CONFIGURED');
    }
    return {
      allowed: true,
      reasonCode: 'CONNECTED_STATUS_FORBIDDEN',
      message: 'local validation only; CONNECTED is never granted',
      resultingState: 'REQUESTED',
      providerStatus: 'AVAILABLE',
    };
  }

  protected operationFrom(
    request: IntegrationRequest,
    state: IntegrationOperation['state'],
    errorCode: string | null,
    safeSummary: string,
  ): IntegrationOperation {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      organizationId: '11111111-1111-1111-1111-111111111111',
      providerKey: this.providerKey,
      operationType: request.operationType,
      state,
      idempotencyKey: request.idempotencyKey,
      purpose: request.purpose,
      dataClassification: request.dataClassification,
      requestDigestSha256: null,
      responseDigestSha256: null,
      safeSummary,
      providerJobReference: null,
      requestedBy: '22222222-2222-2222-2222-222222222222',
      startedAt: null,
      completedAt: state === 'REQUESTED' || state === 'QUEUED' ? null : now,
      expiresAt: null,
      errorCode,
      correlationId: 'integration-contract',
      createdAt: now,
      updatedAt: now,
    };
  }

  protected async maybeProbe(path: string): Promise<void> {
    const transport = this.options.transport;
    if (!transport?.fetch) {
      return;
    }
    const url = `https://mock.local/${this.providerKey.toLowerCase()}/${path}`;
    providerOutboundProbe.record(url);
    await transport.fetch(url);
  }
}

class MockRoboflowAdapter extends BaseMockAdapter {
  readonly providerKey = 'ROBOFLOW' as const;

  protected async adapterValidate(request: IntegrationRequest): Promise<IntegrationPolicyDecision> {
    void request;
    return this.allowValidate();
  }

  protected async adapterExecute(operation: IntegrationOperation): Promise<IntegrationOperation> {
    const confidence = asNumber(this.lastPayload.confidence);
    const decision = roboflowReviewDecision(confidence ?? 0);
    return {
      ...operation,
      state: decision.outcome === 'ABSTAINED' ? 'FAILED' : 'SUCCEEDED',
      errorCode: decision.reason,
      safeSummary: `${decision.outcome}: ${decision.reason}. claimStatus=${decision.claimStatus}. No verified claim created.`,
      completedAt: new Date().toISOString(),
    };
  }
}

class MockHuggingFaceAdapter extends BaseMockAdapter {
  readonly providerKey = 'HUGGINGFACE' as const;

  protected async adapterValidate(request: IntegrationRequest): Promise<IntegrationPolicyDecision> {
    if (!isAllowlistedHfModel(request.payload.modelId)) {
      return deny(
        'SCHEMA_VALIDATION_FAILED',
        'modelId is not on the Hugging Face allow-list',
        'BLOCKED',
      );
    }
    return this.allowValidate();
  }

  protected async adapterExecute(operation: IntegrationOperation): Promise<IntegrationOperation> {
    if (!isAllowlistedHfModel(this.lastPayload.modelId)) {
      return {
        ...operation,
        state: 'BLOCKED',
        errorCode: 'SCHEMA_VALIDATION_FAILED',
        safeSummary: 'modelId is not on the Hugging Face allow-list. No inference ran.',
        completedAt: new Date().toISOString(),
      };
    }
    return {
      ...operation,
      state: 'SUCCEEDED',
      errorCode: null,
      safeSummary: 'Allow-listed catalog lookup DRAFT / INPUT_UNVERIFIED. Not a live model.',
      completedAt: new Date().toISOString(),
    };
  }
}

class MockTinkerAdapter extends BaseMockAdapter {
  readonly providerKey = 'TINKER' as const;

  protected async adapterValidate(request: IntegrationRequest): Promise<IntegrationPolicyDecision> {
    void request;
    return this.allowValidate();
  }

  protected async adapterExecute(operation: IntegrationOperation): Promise<IntegrationOperation> {
    const job = tinkerInklingJobContract();
    return {
      ...operation,
      state: 'REQUESTED',
      errorCode: null,
      safeSummary: `Tinker job intent only. trained=${job.trained} completed=${job.completed}. Not a trained RL policy.`,
      completedAt: null,
    };
  }
}

class MockInklingAdapter extends BaseMockAdapter {
  readonly providerKey = 'INKLING' as const;

  protected async adapterValidate(request: IntegrationRequest): Promise<IntegrationPolicyDecision> {
    void request;
    return this.allowValidate();
  }

  protected async adapterExecute(operation: IntegrationOperation): Promise<IntegrationOperation> {
    const job = tinkerInklingJobContract();
    return {
      ...operation,
      state: 'REQUESTED',
      errorCode: null,
      safeSummary: `Inkling policy artifact request only. trained=${job.trained} completed=${job.completed}.`,
      completedAt: null,
    };
  }
}

class MockHeyGenAdapter extends BaseMockAdapter {
  readonly providerKey = 'HEYGEN' as const;

  protected async adapterValidate(request: IntegrationRequest): Promise<IntegrationPolicyDecision> {
    if (looksLikePii(request.payload)) {
      return deny('UNSAFE_PAYLOAD_FIELD', 'HeyGen payload must not include PII', 'BLOCKED');
    }
    return this.allowValidate();
  }

  protected async adapterExecute(operation: IntegrationOperation): Promise<IntegrationOperation> {
    if (operation.dataClassification === 'RESTRICTED' || looksLikePii(this.lastPayload)) {
      return {
        ...operation,
        state: 'BLOCKED',
        errorCode: 'RESTRICTED_DATA_BLOCKED',
        safeSummary: 'HeyGen blocked PII/RESTRICTED input. Auto-publish is disabled. Not published.',
        completedAt: new Date().toISOString(),
      };
    }
    const publish = heygenPublishDecision();
    return {
      ...operation,
      state: 'REQUESTED',
      errorCode: null,
      safeSummary: `HeyGen executive video DRAFT. autoPublish=${publish.autoPublish} published=${publish.published} status=${publish.status}.`,
      completedAt: null,
    };
  }
}

class MockLangGraphAdapter extends BaseMockAdapter {
  readonly providerKey = 'LANGGRAPH' as const;
  private readonly guard: PrimeProjectionGuard;

  constructor(options: MockAdapterOptions) {
    super(options);
    this.guard = options.projectionGuard ?? createPrimeProjectionGuard();
  }

  protected async adapterValidate(request: IntegrationRequest): Promise<IntegrationPolicyDecision> {
    void request;
    return this.allowValidate();
  }

  protected async adapterExecute(operation: IntegrationOperation): Promise<IntegrationOperation> {
    this.guard.read();
    return {
      ...operation,
      state: 'SUCCEEDED',
      errorCode: null,
      safeSummary: 'LangGraph PRIME projection is read-only. No session write. INPUT_UNVERIFIED.',
      completedAt: new Date().toISOString(),
    };
  }
}

function deny(
  reasonCode: IntegrationPolicyDecision['reasonCode'],
  message: string,
  resultingState: IntegrationPolicyDecision['resultingState'],
): IntegrationPolicyDecision {
  return {
    allowed: false,
    reasonCode,
    message,
    resultingState,
    providerStatus: 'DISABLED',
  };
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function hasUnsafeUrlValue(payload: Record<string, unknown>): boolean {
  for (const value of Object.values(payload)) {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      return true;
    }
  }
  return false;
}

function looksLikePii(payload: Record<string, unknown>): boolean {
  if (findUnsafePayloadField(payload)) {
    return true;
  }
  return Object.keys(payload).some((key) => /pii|ssn|email|phone|passport/i.test(key));
}
