import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AUTH_MODE_DEVELOPMENT, type TenantContext } from '../../../src/auth/types.js';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import { containsSecretMaterial } from '../../../src/integrations/core/secrets.js';
import { createAdapter } from '../../../src/integrations/huggingface/index.js';
import type { HuggingFaceTransport } from '../../../src/integrations/huggingface/transport.js';
import type {
  IntegrationOperation,
  IntegrationRequest,
  ProviderAdapter,
} from '../../../src/integrations/types.js';

const APPROVED_MODEL = 'google/flan-t5-small';
const SHA256_A = 'a'.repeat(64);
const HF_TOKEN = 'hf_test_credential_must_never_leak_xx';

const tenant: TenantContext = {
  organizationId: '11111111-1111-1111-1111-111111111111',
  actorId: '22222222-2222-2222-2222-222222222222',
  role: 'OWNER',
  authMode: AUTH_MODE_DEVELOPMENT,
  correlationId: 'corr-hf-adapter',
};

const systemContext = {
  correlationId: tenant.correlationId,
  actorId: tenant.actorId,
  timeoutMs: 10_000,
};

function catalogRequest(overrides: Partial<IntegrationRequest> = {}): IntegrationRequest {
  return {
    providerKey: 'HUGGINGFACE',
    operationType: 'MODEL_CATALOG_LOOKUP',
    purpose: 'MODEL_CATALOG_LOOKUP',
    dataClassification: 'INTERNAL',
    idempotencyKey: 'hf-catalog-1',
    payload: { modelId: APPROVED_MODEL },
    ...overrides,
  };
}

function inferenceRequest(overrides: Partial<IntegrationRequest> = {}): IntegrationRequest {
  return {
    providerKey: 'HUGGINGFACE',
    operationType: 'APPROVED_INFERENCE_REQUEST',
    purpose: 'APPROVED_INFERENCE_REQUEST',
    dataClassification: 'INTERNAL',
    idempotencyKey: 'hf-infer-1',
    payload: { modelId: APPROVED_MODEL, inputDigestSha256: SHA256_A },
    ...overrides,
  };
}

function createMockTransport(options?: {
  status?: number;
  body?: unknown;
}): HuggingFaceTransport & { calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  return {
    calls,
    async request(url: string, init: RequestInit) {
      calls.push({ url, init });
      return {
        status: options?.status ?? 200,
        async json() {
          return options?.body ?? { id: 'health', pipeline_tag: 'text-classification' };
        },
      };
    },
  };
}

function configuredAdapter(
  transport: HuggingFaceTransport,
  allowListedModelIds: string[] = [APPROVED_MODEL],
): ProviderAdapter {
  process.env.EARTH_INTEGRATION_HUGGINGFACE_ENABLED = 'true';
  process.env.EARTH_INTEGRATION_HUGGINGFACE_TOKEN = HF_TOKEN;
  return createAdapter({ transport, allowListedModelIds });
}

function assertNotConnected(value: unknown): void {
  const text = JSON.stringify(value);
  expect(text).not.toContain('"connected":true');
  expect(text).not.toMatch(/"status"\s*:\s*"CONNECTED"/);
  expect(text).not.toContain(HF_TOKEN);
  expect(containsSecretMaterial(value, [HF_TOKEN])).toBe(false);
}

function clearHfEnv(): void {
  delete process.env.EARTH_INTEGRATION_HUGGINGFACE_ENABLED;
  delete process.env.EARTH_INTEGRATION_HUGGINGFACE_TOKEN;
  delete process.env.HF_TOKEN;
  delete process.env.HUGGINGFACE_TOKEN;
}

describe('Hugging Face server adapter', () => {
  beforeEach(() => {
    providerOutboundProbe.reset();
    clearHfEnv();
  });

  afterEach(() => {
    clearHfEnv();
    providerOutboundProbe.reset();
  });

  it('exports createAdapter and defaults to NOT_CONFIGURED with no network', async () => {
    const adapter = createAdapter();
    expect(adapter.providerKey).toBe('HUGGINGFACE');

    const status = await adapter.getStatus(tenant);
    const health = await adapter.checkHealth(systemContext);

    expect(status.status).toBe('NOT_CONFIGURED');
    expect(health.status).toBe('NOT_CONFIGURED');
    expect(status.connected).toBe(false);
    expect(health.connected).toBe(false);
    expect(status.configured).toBe(false);
    expect(status.enabled).toBe(false);
    expect(status.healthy).toBe(false);
    expect(status.reasonCode).toBe('PROVIDER_NOT_CONFIGURED');
    expect(providerOutboundProbe.calls).toBe(0);
    assertNotConnected(status);
    assertNotConnected(health);
  });

  it('does not treat a configured token as CONNECTED without health', async () => {
    process.env.EARTH_INTEGRATION_HUGGINGFACE_ENABLED = 'false';
    process.env.EARTH_INTEGRATION_HUGGINGFACE_TOKEN = HF_TOKEN;
    const adapter = createAdapter();
    const status = await adapter.getStatus(tenant);

    expect(status.configured).toBe(true);
    expect(status.enabled).toBe(false);
    expect(['NOT_CONFIGURED', 'DEGRADED']).toContain(status.status);
    expect(status.connected).toBe(false);
    expect(status.healthy).toBe(false);
    expect(providerOutboundProbe.calls).toBe(0);
    assertNotConnected(status);
  });

  it('reports DEGRADED when enabled with credential but no transport health', async () => {
    process.env.EARTH_INTEGRATION_HUGGINGFACE_ENABLED = 'true';
    process.env.EARTH_INTEGRATION_HUGGINGFACE_TOKEN = HF_TOKEN;
    const adapter = createAdapter({ allowListedModelIds: [APPROVED_MODEL] });
    const status = await adapter.getStatus(tenant);

    expect(status.configured).toBe(true);
    expect(status.enabled).toBe(true);
    expect(status.status).toBe('DEGRADED');
    expect(status.connected).toBe(false);
    expect(status.healthy).toBe(false);
    expect(providerOutboundProbe.calls).toBe(0);
    assertNotConnected(status);
  });

  it('becomes AVAILABLE (never CONNECTED) after enable, credential, and mock health 200', async () => {
    const transport = createMockTransport({
      status: 200,
      body: { id: 'hub', pipeline_tag: 'text-classification' },
    });
    const adapter = configuredAdapter(transport);
    const health = await adapter.checkHealth(systemContext);

    expect(health.status).toBe('AVAILABLE');
    expect(health.healthy).toBe(true);
    expect(health.connected).toBe(false);
    expect(health.configured).toBe(true);
    expect(health.enabled).toBe(true);
    expect(transport.calls.length).toBeGreaterThan(0);
    expect(transport.calls.every((call) => call.url.startsWith('https://huggingface.co/api/'))).toBe(
      true,
    );
    expect(JSON.stringify(transport.calls)).not.toContain(HF_TOKEN);
    assertNotConnected(health);
  });

  it('rejects a default-empty allow-list even for a well-formed model id', async () => {
    const adapter = createAdapter();
    const decision = await adapter.validateRequest(tenant, catalogRequest());
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('SCHEMA_VALIDATION_FAILED');
    expect(decision.resultingState).toBe('BLOCKED');
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('rejects a tenant-supplied model id that is not on the server allow-list', async () => {
    const adapter = createAdapter({ allowListedModelIds: [APPROVED_MODEL] });
    const decision = await adapter.validateRequest(
      tenant,
      catalogRequest({ payload: { modelId: 'bigscience/bloom' } }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('SCHEMA_VALIDATION_FAILED');
    expect(decision.message).toMatch(/allow-list/i);
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('accepts catalog lookup for an allow-listed model id', async () => {
    const adapter = createAdapter({ allowListedModelIds: [APPROVED_MODEL] });
    const decision = await adapter.validateRequest(tenant, catalogRequest());
    expect(decision.allowed).toBe(true);
    expect(decision.providerStatus).not.toBe('AVAILABLE');
  });

  it('rejects Hugging Face URLs, path traversal, file: URIs, and huggingface.co hosts', async () => {
    const adapter = createAdapter({ allowListedModelIds: [APPROVED_MODEL] });
    const attacks = [
      { modelId: 'https://huggingface.co/google/flan-t5-small' },
      { modelId: 'http://huggingface.co/google/flan-t5-small' },
      { modelId: '../google/flan-t5-small' },
      { modelId: 'google/../flan-t5-small' },
      { modelId: 'file:///etc/passwd' },
      { modelId: 'google/flan-t5-small', endpoint: 'https://huggingface.co/spaces/evil' },
      { modelId: 'google/flan-t5-small', host: 'huggingface.co' },
      { modelId: 'google/flan-t5-small%2f..%2f..%2fetc' },
    ];

    for (const payload of attacks) {
      const decision = await adapter.validateRequest(tenant, catalogRequest({ payload }));
      expect(decision.allowed, JSON.stringify(payload)).toBe(false);
      expect(decision.reasonCode, JSON.stringify(payload)).toBe('UNSAFE_PAYLOAD_FIELD');
    }
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('requires digest-only inference payloads and rejects raw prompts or documents', async () => {
    const adapter = createAdapter({ allowListedModelIds: [APPROVED_MODEL] });

    const missingDigest = await adapter.validateRequest(
      tenant,
      inferenceRequest({ payload: { modelId: APPROVED_MODEL } }),
    );
    expect(missingDigest.allowed).toBe(false);
    expect(missingDigest.reasonCode).toBe('SCHEMA_VALIDATION_FAILED');

    const rawPrompt = await adapter.validateRequest(
      tenant,
      inferenceRequest({
        payload: { modelId: APPROVED_MODEL, inputDigestSha256: SHA256_A, text: 'secret prompt' },
      }),
    );
    expect(rawPrompt.allowed).toBe(false);
    expect(['SCHEMA_VALIDATION_FAILED', 'UNSAFE_PAYLOAD_FIELD']).toContain(rawPrompt.reasonCode);

    const valid = await adapter.validateRequest(tenant, inferenceRequest());
    expect(valid.allowed).toBe(true);
  });

  it('always blocks RESTRICTED data and refuses secret-like raw text', async () => {
    const adapter = createAdapter({ allowListedModelIds: [APPROVED_MODEL] });

    const restricted = await adapter.validateRequest(
      tenant,
      catalogRequest({ dataClassification: 'RESTRICTED' }),
    );
    expect(restricted.allowed).toBe(false);
    expect(restricted.reasonCode).toBe('RESTRICTED_DATA_BLOCKED');

    const secretLike = await adapter.validateRequest(
      tenant,
      catalogRequest({
        dataClassification: 'CONFIDENTIAL',
        payload: { modelId: APPROVED_MODEL, note: 'hf_abcdefghijklmnopqrstuvwxyz1234' },
      }),
    );
    expect(secretLike.allowed).toBe(false);
    expect(secretLike.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');
  });

  it('refuses executeOperation unless status would be AVAILABLE after injected health', async () => {
    const adapter = createAdapter({ allowListedModelIds: [APPROVED_MODEL] });
    const created = await adapter.createOperation(tenant, catalogRequest());
    const executed = await adapter.executeOperation(systemContext, created);

    expect(executed.state).toBe('NOT_CONFIGURED');
    expect(executed.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
    expect(providerOutboundProbe.calls).toBe(0);
    expect(JSON.stringify(executed)).not.toMatch(/"status"\s*:\s*"CONNECTED"/);
  });

  it('records a DRAFT catalog lookup via mock transport using an allow-listed hub URL only', async () => {
    const transport = createMockTransport({
      status: 200,
      body: { id: APPROVED_MODEL, pipeline_tag: 'text2text-generation', downloads: 12 },
    });
    const adapter = configuredAdapter(transport);
    const created = await adapter.createOperation(tenant, catalogRequest());
    const executed = await adapter.executeOperation(systemContext, created);

    expect(executed.state).toBe('SUCCEEDED');
    expect(executed.safeSummary).toMatch(/DRAFT/i);
    expect(executed.safeSummary).toMatch(/unverified/i);
    expect(executed.safeSummary).not.toMatch(/\bVERIFIED\b/);
    expect(executed.responseDigestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(executed.providerJobReference).toContain(APPROVED_MODEL);
    expect(JSON.stringify(executed)).not.toContain('text2text-generation');
    expect(transport.calls.some((call) => call.url === `https://huggingface.co/api/models/${APPROVED_MODEL}`)).toBe(
      true,
    );
    expect(transport.calls.every((call) => !call.url.includes('..'))).toBe(true);
    expect(JSON.stringify(executed)).not.toContain(HF_TOKEN);
    assertNotConnected(executed);
  });

  it('records a DRAFT inference job request without sending the digest as model input', async () => {
    const transport = createMockTransport();
    const adapter = configuredAdapter(transport);
    const created = await adapter.createOperation(tenant, inferenceRequest());
    const executed = await adapter.executeOperation(systemContext, created);

    expect(executed.state).toBe('SUCCEEDED');
    expect(executed.safeSummary).toMatch(/DRAFT/i);
    expect(executed.safeSummary).not.toMatch(/\bVERIFIED\b/);
    const bodies = transport.calls.map((call) => call.init.body).filter(Boolean);
    expect(bodies.join('')).not.toContain(SHA256_A);
    expect(JSON.stringify(executed)).not.toContain(HF_TOKEN);
    assertNotConnected(executed);
  });

  it('rejects unsupported operations such as Spaces launch or model download', async () => {
    const adapter = createAdapter({ allowListedModelIds: [APPROVED_MODEL] });
    const decision = await adapter.validateRequest(
      tenant,
      catalogRequest({ operationType: 'SPACE_LAUNCH', purpose: 'MODEL_CATALOG_LOOKUP' }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('OPERATION_NOT_SUPPORTED');
  });

  it('cancels locally without calling the transport', async () => {
    const transport = createMockTransport();
    const adapter = configuredAdapter(transport);
    const created = await adapter.createOperation(tenant, catalogRequest());
    const before = transport.calls.length;
    const cancelled = await adapter.cancelOperation(tenant, created.id);
    expect(cancelled.state).toBe('CANCELLED');
    expect(transport.calls.length).toBe(before);
  });
});

describe('Hugging Face adapter operation shape', () => {
  it('createOperation returns a tenant-scoped operation that is never CONNECTED', async () => {
    clearHfEnv();
    providerOutboundProbe.reset();
    const adapter = createAdapter({ allowListedModelIds: [APPROVED_MODEL] });
    const operation: IntegrationOperation = await adapter.createOperation(tenant, catalogRequest());
    expect(operation.providerKey).toBe('HUGGINGFACE');
    expect(operation.organizationId).toBe(tenant.organizationId);
    expect(operation.operationType).toBe('MODEL_CATALOG_LOOKUP');
    expect(['NOT_CONFIGURED', 'REQUESTED', 'QUEUED', 'BLOCKED']).toContain(operation.state);
    expect(JSON.stringify(operation)).not.toContain('"connected":true');
    providerOutboundProbe.reset();
  });
});
