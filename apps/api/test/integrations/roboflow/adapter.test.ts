import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AUTH_MODE_DEVELOPMENT, type TenantContext } from '../../../src/auth/types.js';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import {
  createAdapter,
  MAX_IMAGE_BYTES,
  parseDraftResult,
  ROBOFLOW_HEALTH_URL,
  ROBOFLOW_INFER_URL,
} from '../../../src/integrations/roboflow/index.js';
import type { RoboflowTransport } from '../../../src/integrations/roboflow/transport.js';
import type {
  IntegrationOperation,
  IntegrationRequest,
  IntegrationSystemContext,
} from '../../../src/integrations/types.js';

const SECRET = 'rf_unit_test_secret_do_not_leak_xx';

const ENV_KEYS = [
  'EARTH_INTEGRATION_ROBOFLOW_ENABLED',
  'EARTH_INTEGRATION_ROBOFLOW_API_KEY',
  'ROBOFLOW_API_KEY',
] as const;

const tenant: TenantContext = {
  organizationId: '11111111-1111-1111-1111-111111111111',
  actorId: '22222222-2222-2222-2222-222222222222',
  role: 'OWNER',
  authMode: AUTH_MODE_DEVELOPMENT,
  correlationId: 'corr-roboflow-adapter',
};

const systemContext: IntegrationSystemContext = {
  correlationId: tenant.correlationId,
  actorId: tenant.actorId,
  timeoutMs: 5_000,
};

function assertNoLeak(value: unknown): void {
  const text = JSON.stringify(value);
  expect(text).not.toContain(SECRET);
  expect(text).not.toMatch(/api[_-]?key/i);
  expect(text).not.toMatch(/Bearer /);
  expect(text).not.toContain('"connected":true');
  expect(text).not.toContain('"VERIFIED"');
}

function inferenceRequest(overrides: Partial<IntegrationRequest> = {}): IntegrationRequest {
  return {
    providerKey: 'ROBOFLOW',
    operationType: 'MATERIAL_IMAGE_INFERENCE',
    purpose: 'MATERIAL_IMAGE_INFERENCE',
    dataClassification: 'INTERNAL',
    idempotencyKey: 'rf-op-1',
    payload: {
      objectStorageRef: 'earth://internal/img-1',
      byteLength: 2048,
    },
    ...overrides,
  };
}

class RecordingTransport implements RoboflowTransport {
  readonly calls: Array<{ url: string; init: RequestInit }> = [];

  constructor(
    private readonly handler: (url: string, init: RequestInit) => { status: number; body: unknown },
  ) {}

  async request(
    url: string,
    init: RequestInit,
  ): Promise<{ status: number; json(): Promise<unknown> }> {
    this.calls.push({ url, init });
    const result = this.handler(url, init);
    return {
      status: result.status,
      json: async () => result.body,
    };
  }
}

function enableProvider(): void {
  process.env.EARTH_INTEGRATION_ROBOFLOW_ENABLED = 'true';
  process.env.EARTH_INTEGRATION_ROBOFLOW_API_KEY = SECRET;
}

function capabilityTransport(options?: {
  healthStatus?: number;
  healthBody?: unknown;
  confidence?: number;
  labels?: string[];
}): RecordingTransport {
  const healthStatus = options?.healthStatus ?? 200;
  const healthBody = options?.healthBody ?? { models: [{ id: 'earth-material-v0' }] };
  const confidence = options?.confidence ?? 0.91;
  const labels = options?.labels ?? ['HDPE'];
  return new RecordingTransport((url) => {
    if (url === ROBOFLOW_HEALTH_URL) {
      return { status: healthStatus, body: healthBody };
    }
    return {
      status: 200,
      body: {
        predictions: labels.map((label) => ({ class: label, confidence })),
        model: 'earth-material-v0',
      },
    };
  });
}

describe('Roboflow server adapter v0.1', () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    providerOutboundProbe.reset();
    fetchCalls = 0;
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('real HTTP is forbidden in the Roboflow adapter');
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    providerOutboundProbe.reset();
  });

  it('exports createAdapter and defaults to NOT_CONFIGURED without a transport', async () => {
    const adapter = createAdapter();
    expect(adapter.providerKey).toBe('ROBOFLOW');
    const status = await adapter.getStatus(tenant);
    const health = await adapter.checkHealth(systemContext);
    expect(status.status).toBe('NOT_CONFIGURED');
    expect(health.status).toBe('NOT_CONFIGURED');
    expect(status.connected).toBe(false);
    expect(health.connected).toBe(false);
    expect(status.healthy).toBe(false);
    expect(status.reasonCode).toBe('PROVIDER_NOT_CONFIGURED');
    expect(fetchCalls).toBe(0);
    expect(providerOutboundProbe.calls).toBe(0);
    assertNoLeak(status);
    assertNoLeak(health);
  });

  it('does not fetch by default when execute is reached without health', async () => {
    const adapter = createAdapter();
    const operation = syntheticOperation();
    const executed = await adapter.executeOperation(systemContext, operation);
    expect(executed.state).toBe('NOT_CONFIGURED');
    expect(executed.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
    const draft = parseDraftResult(executed.safeSummary);
    expect(draft?.status).toBe('NOT_CONFIGURED');
    expect(draft?.status).not.toBe('VERIFIED');
    expect(fetchCalls).toBe(0);
    expect(providerOutboundProbe.calls).toBe(0);
    assertNoLeak(executed);
  });

  it('rejects SSRF http(s) URLs without calling transport', async () => {
    enableProvider();
    const transport = capabilityTransport();
    const adapter = createAdapter({ transport });
    const httpsRef = await adapter.validateRequest(
      tenant,
      inferenceRequest({
        payload: {
          objectStorageRef: 'https://evil.example/image.png',
          byteLength: 100,
        },
      }),
    );
    const httpRef = await adapter.validateRequest(
      tenant,
      inferenceRequest({
        payload: {
          objectStorageRef: 'http://169.254.169.254/latest/meta-data',
          byteLength: 100,
        },
      }),
    );
    const nested = await adapter.validateRequest(
      tenant,
      inferenceRequest({
        payload: {
          objectStorageRef: 'earth://internal/img-1',
          byteLength: 100,
          imageUrl: 'https://cdn.example/leak.png',
        },
      }),
    );
    expect(httpsRef.allowed).toBe(false);
    expect(httpRef.allowed).toBe(false);
    expect(nested.allowed).toBe(false);
    expect(httpsRef.reasonCode).toBe('SCHEMA_VALIDATION_FAILED');
    expect(transport.calls).toHaveLength(0);
    expect(fetchCalls).toBe(0);
    expect(providerOutboundProbe.calls).toBe(0);
    assertNoLeak(httpsRef);
  });

  it('rejects data URIs, image bytes, and apiKey without fetch', async () => {
    enableProvider();
    const transport = capabilityTransport();
    const adapter = createAdapter({ transport });

    const dataUri = await adapter.validateRequest(
      tenant,
      inferenceRequest({
        payload: {
          objectStorageRef: 'data:image/png;base64,aaaa',
          byteLength: 4,
        },
      }),
    );
    const apiKey = await adapter.validateRequest(
      tenant,
      inferenceRequest({
        payload: {
          objectStorageRef: 'earth://internal/img-1',
          byteLength: 4,
          apiKey: SECRET,
        },
      }),
    );
    const imageBytes = await adapter.validateRequest(
      tenant,
      inferenceRequest({
        payload: {
          objectStorageRef: 'earth://internal/img-1',
          byteLength: 4,
          imageBytes: 'AAAA',
        },
      }),
    );
    expect(dataUri.allowed).toBe(false);
    expect(apiKey.allowed).toBe(false);
    expect(apiKey.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');
    expect(imageBytes.allowed).toBe(false);
    expect(transport.calls).toHaveLength(0);
    assertNoLeak(apiKey);
    assertNoLeak(dataUri);
  });

  it('fails validation for missing or oversized byteLength without fetch', async () => {
    enableProvider();
    const transport = capabilityTransport();
    const adapter = createAdapter({ transport });
    const missing = await adapter.validateRequest(
      tenant,
      inferenceRequest({
        payload: { objectStorageRef: 'earth://object/bucket/key-1' },
      }),
    );
    const oversized = await adapter.validateRequest(
      tenant,
      inferenceRequest({
        payload: {
          objectStorageRef: 'earth://object/bucket/key-1',
          byteLength: MAX_IMAGE_BYTES + 1,
        },
      }),
    );
    expect(missing.allowed).toBe(false);
    expect(missing.reasonCode).toBe('SCHEMA_VALIDATION_FAILED');
    expect(oversized.allowed).toBe(false);
    expect(oversized.reasonCode).toBe('PAYLOAD_TOO_LARGE');
    expect(transport.calls).toHaveLength(0);
    expect(fetchCalls).toBe(0);
  });

  it('records mock transport calls for health and inference and never CONNECTED', async () => {
    enableProvider();
    const transport = capabilityTransport({ confidence: 0.93 });
    const adapter = createAdapter({ transport });
    const health = await adapter.checkHealth(systemContext);
    expect(health.status).toBe('AVAILABLE');
    expect(health.connected).toBe(false);
    expect(health.healthy).toBe(true);
    expect(transport.calls.map((call) => call.url)).toEqual([ROBOFLOW_HEALTH_URL]);

    const created = await adapter.createOperation(tenant, inferenceRequest());
    const executed = await adapter.executeOperation(systemContext, created);
    expect(executed.state).toBe('SUCCEEDED');
    const draft = parseDraftResult(executed.safeSummary);
    expect(draft).toMatchObject({
      labels: ['HDPE'],
      status: 'DRAFT',
      operationId: created.id,
    });
    expect(draft?.status).not.toBe('VERIFIED');
    expect(transport.calls.map((call) => call.url)).toEqual([
      ROBOFLOW_HEALTH_URL,
      ROBOFLOW_HEALTH_URL,
      'earth://internal/img-1',
      ROBOFLOW_INFER_URL,
    ]);
    expect(fetchCalls).toBe(0);
    for (const call of transport.calls) {
      assertNoLeak(call);
    }
    assertNoLeak(health);
    assertNoLeak(executed);
  });

  it('abstains when confidence is below the tenant threshold', async () => {
    enableProvider();
    const transport = capabilityTransport({ confidence: 0.12 });
    const adapter = createAdapter({ transport });
    const created = await adapter.createOperation(
      tenant,
      inferenceRequest({
        idempotencyKey: 'rf-low-conf',
        payload: {
          objectStorageRef: 'earth://internal/img-low',
          byteLength: 1024,
          confidenceThreshold: 0.8,
        },
      }),
    );
    const executed = await adapter.executeOperation(systemContext, created);
    const draft = parseDraftResult(executed.safeSummary);
    expect(draft?.status).toBe('ABSTAINED');
    expect(draft?.confidence).toBe(0.12);
    expect(draft?.status).not.toBe('VERIFIED');
    expect(executed.state).toBe('SUCCEEDED');
    assertNoLeak(executed);
  });

  it('requests human review for borderline confidence and accepts earth://object refs', async () => {
    enableProvider();
    const transport = capabilityTransport({ confidence: 0.62, labels: ['MIXED_POLYMER'] });
    const adapter = createAdapter({ transport });
    const created = await adapter.createOperation(
      tenant,
      inferenceRequest({
        idempotencyKey: 'rf-review',
        payload: {
          objectStorageRef: 'earth://object/materials/batch-9',
          byteLength: 4096,
        },
      }),
    );
    const executed = await adapter.executeOperation(systemContext, created);
    const draft = parseDraftResult(executed.safeSummary);
    expect(draft?.status).toBe('REQUIRES_HUMAN_REVIEW');
    expect(transport.calls.some((call) => call.url === 'earth://object/materials/batch-9')).toBe(
      true,
    );
    assertNoLeak(executed);
  });

  it('treats a configured key without successful health as NOT_CONFIGURED or DEGRADED', async () => {
    process.env.EARTH_INTEGRATION_ROBOFLOW_ENABLED = 'false';
    process.env.EARTH_INTEGRATION_ROBOFLOW_API_KEY = SECRET;
    const disabled = createAdapter({ transport: capabilityTransport() });
    const disabledHealth = await disabled.getStatus(tenant);
    expect(disabledHealth.status).toBe('NOT_CONFIGURED');
    expect(disabledHealth.connected).toBe(false);
    expect(disabledHealth.configured).toBe(true);
    expect(disabledHealth.enabled).toBe(false);
    assertNoLeak(disabledHealth);

    enableProvider();
    const failed = createAdapter({
      transport: capabilityTransport({ healthStatus: 503, healthBody: { error: 'down' } }),
    });
    const failedHealth = await failed.checkHealth(systemContext);
    expect(['DEGRADED', 'ERROR', 'NOT_CONFIGURED']).toContain(failedHealth.status);
    expect(failedHealth.status).not.toBe('AVAILABLE');
    expect(failedHealth.connected).toBe(false);
    expect(failedHealth.healthy).toBe(false);
    assertNoLeak(failedHealth);

    const noTransport = createAdapter();
    const pending = await noTransport.getStatus(tenant);
    expect(['NOT_CONFIGURED', 'DEGRADED']).toContain(pending.status);
    expect(pending.connected).toBe(false);
    expect(fetchCalls).toBe(0);
    assertNoLeak(pending);
  });

  it('does not leak the credential in create, cancel, or execute responses', async () => {
    enableProvider();
    const transport = capabilityTransport();
    const adapter = createAdapter({ transport });
    const created = await adapter.createOperation(tenant, inferenceRequest());
    const cancelled = await adapter.cancelOperation(tenant, created.id);
    expect(cancelled.state).toBe('CANCELLED');
    const executed = await adapter.executeOperation(systemContext, created);
    expect(executed.state).toBe('CANCELLED');
    assertNoLeak(created);
    assertNoLeak(cancelled);
    assertNoLeak(executed);
    assertNoLeak(transport.calls);
  });

  it('blocks RESTRICTED classification and never claims CONNECTED', async () => {
    enableProvider();
    const adapter = createAdapter({ transport: capabilityTransport() });
    const decision = await adapter.validateRequest(
      tenant,
      inferenceRequest({ dataClassification: 'RESTRICTED' }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('RESTRICTED_DATA_BLOCKED');
    expect(decision.providerStatus).not.toBe('AVAILABLE');
    assertNoLeak(decision);
  });
});

function syntheticOperation(): IntegrationOperation {
  const now = new Date().toISOString();
  return {
    id: '00000000-0000-4000-8000-000000000099',
    organizationId: tenant.organizationId,
    providerKey: 'ROBOFLOW',
    operationType: 'MATERIAL_IMAGE_INFERENCE',
    state: 'NOT_CONFIGURED',
    idempotencyKey: 'synth-1',
    purpose: 'MATERIAL_IMAGE_INFERENCE',
    dataClassification: 'INTERNAL',
    requestDigestSha256: null,
    responseDigestSha256: null,
    safeSummary: null,
    providerJobReference: null,
    requestedBy: tenant.actorId,
    startedAt: null,
    completedAt: null,
    expiresAt: null,
    errorCode: 'PROVIDER_NOT_CONFIGURED',
    correlationId: tenant.correlationId,
    createdAt: now,
    updatedAt: now,
  };
}
