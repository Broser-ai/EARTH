import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_MODE_DEVELOPMENT, type TenantContext } from '../../../src/auth/types.js';
import { DisabledAdapter } from '../../../src/integrations/core/disabled-adapter.js';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import { createIntegrationRegistry } from '../../../src/integrations/registry.js';
import { createAdapter } from '../../../src/integrations/tinker/index.js';
import type { InjectedTransport } from '../../../src/integrations/tinker/transport.js';
import type {
  IntegrationOperation,
  IntegrationRequest,
  IntegrationSystemContext,
  ProviderHealthResult,
} from '../../../src/integrations/types.js';

const DIGEST = 'ab'.repeat(32);
const SECRET = 'tk_test_secret_do_not_leak_xx';
const SOURCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../src/integrations/tinker');

const tenant: TenantContext = {
  organizationId: '11111111-1111-1111-1111-111111111111',
  actorId: '22222222-2222-2222-2222-222222222222',
  role: 'OWNER',
  authMode: AUTH_MODE_DEVELOPMENT,
  correlationId: 'corr-tinker-test',
};

const system: IntegrationSystemContext = {
  correlationId: tenant.correlationId,
  actorId: tenant.actorId,
  timeoutMs: 10_000,
};

function validRequest(overrides: Partial<IntegrationRequest> = {}): IntegrationRequest {
  return {
    providerKey: 'TINKER',
    operationType: 'TINKER_TRAINING_JOB_REQUEST',
    purpose: 'TINKER_TRAINING_JOB_REQUEST',
    dataClassification: 'INTERNAL',
    idempotencyKey: 'tinker-intent-1',
    payload: {
      datasetDigestSha256: DIGEST,
      approvedDatasetRef: 'earth://internal/datasets/approved-hdpe-v1',
      modelReference: 'earth-tinker-base-v0',
      purpose: 'TINKER_TRAINING_JOB_REQUEST',
      estimatedCostDkk: 25,
    },
    estimatedCostDkk: 25,
    ...overrides,
  };
}

class RecordingTransport implements InjectedTransport {
  readonly calls: Array<{ url: string; init: RequestInit }> = [];

  constructor(
    private readonly handler: (
      url: string,
      init: RequestInit,
    ) => Promise<{ status: number; body: unknown }> = async () => ({
      status: 200,
      body: { capable: true, trained: false, complete: false, connected: false },
    }),
  ) {}

  async request(url: string, init: RequestInit): Promise<{ status: number; json(): Promise<unknown> }> {
    this.calls.push({ url, init });
    const result = await this.handler(url, init);
    return {
      status: result.status,
      json: async () => result.body,
    };
  }
}

function enabledEnv(): NodeJS.ProcessEnv {
  return {
    EARTH_INTEGRATION_TINKER_ENABLED: 'true',
    EARTH_INTEGRATION_TINKER_API_KEY: SECRET,
  };
}

function assertNeverConnected(health: ProviderHealthResult): void {
  expect(health.connected).toBe(false);
  expect(health.status).not.toBe('CONNECTED');
  expect(String(health.status)).not.toBe('CONNECTED');
  expect(JSON.stringify(health)).not.toContain('"connected":true');
}

function assertIntentNotTrained(operation: IntegrationOperation): void {
  const summary = `${operation.safeSummary ?? ''} ${operation.errorCode ?? ''}`.toLowerCase();
  expect(summary).toMatch(/intent/);
  expect(summary).not.toMatch(/trained complete|training complete|fine-tune complete/);
  expect(operation.state).not.toBe('SUCCEEDED');
  expect(operation.state).not.toBe('RUNNING');
  expect(JSON.stringify(operation)).not.toContain('"connected":true');
  expect(JSON.stringify(operation)).not.toContain(SECRET);
}

describe('Tinker intent-only adapter', () => {
  afterEach(() => {
    providerOutboundProbe.reset();
    vi.restoreAllMocks();
  });

  it('exports createAdapter with providerKey TINKER', () => {
    const adapter = createAdapter({ env: {} });
    expect(adapter.providerKey).toBe('TINKER');
  });

  it('defaults to NOT_CONFIGURED and never CONNECTED without transport', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('global fetch must not be used');
    });
    const adapter = createAdapter({ env: {} });
    const status = await adapter.getStatus(tenant);
    const health = await adapter.checkHealth(system);
    expect(status.status).toBe('NOT_CONFIGURED');
    expect(health.status).toBe('NOT_CONFIGURED');
    expect(status.configured).toBe(false);
    expect(status.enabled).toBe(false);
    expect(status.healthy).toBe(false);
    assertNeverConnected(status);
    assertNeverConnected(health);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('does not treat a configured credential as AVAILABLE or trained', async () => {
    const adapter = createAdapter({
      env: {
        EARTH_INTEGRATION_TINKER_ENABLED: 'false',
        EARTH_INTEGRATION_TINKER_API_KEY: SECRET,
      },
    });
    const status = await adapter.getStatus(tenant);
    expect(status.configured).toBe(true);
    expect(status.enabled).toBe(false);
    expect(status.healthy).toBe(false);
    expect(status.status).not.toBe('AVAILABLE');
    expect(['NOT_CONFIGURED', 'DISABLED']).toContain(status.status);
    assertNeverConnected(status);
    expect(JSON.stringify(status)).not.toContain(SECRET);
  });

  it('stays NOT_CONFIGURED or DEGRADED when enabled with credential but no health transport', async () => {
    const adapter = createAdapter({ env: enabledEnv() });
    const health = await adapter.checkHealth(system);
    expect(health.configured).toBe(true);
    expect(health.enabled).toBe(true);
    expect(health.healthy).toBe(false);
    expect(health.status).not.toBe('AVAILABLE');
    expect(['NOT_CONFIGURED', 'DEGRADED']).toContain(health.status);
    assertNeverConnected(health);
  });

  it('returns AVAILABLE with connected false after enable, credential, and injected health 200', async () => {
    const transport = new RecordingTransport();
    const adapter = createAdapter({ env: enabledEnv(), transport });
    const health = await adapter.checkHealth(system);
    expect(health.status).toBe('AVAILABLE');
    expect(health.healthy).toBe(true);
    expect(health.configured).toBe(true);
    expect(health.enabled).toBe(true);
    assertNeverConnected(health);
    expect(transport.calls.length).toBeGreaterThan(0);
    expect(transport.calls.every((call) => call.url.startsWith('earth://internal/'))).toBe(true);
    expect(transport.calls.every((call) => !call.url.startsWith('http'))).toBe(true);
    expect(JSON.stringify(transport.calls)).not.toContain(SECRET);
  });

  it('refuses CONNECTED claims from a mock health body', async () => {
    const transport = new RecordingTransport(async () => ({
      status: 200,
      body: { capable: true, connected: true, trained: true },
    }));
    const adapter = createAdapter({ env: enabledEnv(), transport });
    const health = await adapter.checkHealth(system);
    expect(health.status).not.toBe('AVAILABLE');
    expect(health.reasonCode).toBe('CONNECTED_STATUS_FORBIDDEN');
    assertNeverConnected(health);
  });

  it('requires human approval semantics even when the job would otherwise queue', async () => {
    const transport = new RecordingTransport();
    const adapter = createAdapter({ env: enabledEnv(), transport });
    const decision = await adapter.validateRequest(tenant, validRequest());
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('HUMAN_APPROVAL_REQUIRED');
    expect(decision.resultingState).toBe('REQUESTED');
    expect(decision.providerStatus).not.toBe('AVAILABLE');
  });

  it('still does not execute training when approvalReference is present', async () => {
    const transport = new RecordingTransport();
    const adapter = createAdapter({ env: enabledEnv(), transport });
    const decision = await adapter.validateRequest(
      tenant,
      validRequest({ approvalReference: 'approval://durable/tinker-1' }),
    );
    expect(decision.reasonCode).not.toBe('HUMAN_APPROVAL_REQUIRED');
    const created = await adapter.createOperation(
      tenant,
      validRequest({ approvalReference: 'approval://durable/tinker-1' }),
    );
    const executed = await adapter.executeOperation(system, created);
    assertIntentNotTrained(executed);
    expect(executed.safeSummary?.toLowerCase()).toContain('not trained');
    expect(executed.safeSummary?.toLowerCase()).toContain('not complete');
    const sent = JSON.stringify(transport.calls.map((call) => call.init)).toLowerCase();
    expect(sent).not.toContain('"dataset"');
    expect(sent).not.toContain('trajectories');
    expect(sent).not.toContain('documents');
    expect(sent).not.toContain(SECRET);
  });

  it('rejects raw training data, documents, and RL trajectories', async () => {
    const adapter = createAdapter({ env: enabledEnv(), transport: new RecordingTransport() });
    const documents = await adapter.validateRequest(
      tenant,
      validRequest({ payload: { ...validRequest().payload, documents: ['raw-corpus'] } }),
    );
    expect(documents.allowed).toBe(false);
    expect(documents.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');

    const trajectories = await adapter.validateRequest(
      tenant,
      validRequest({
        payload: {
          ...validRequest().payload,
          trajectories: [{ reward: 1, sessionRlPolicy: true }],
        },
      }),
    );
    expect(trajectories.allowed).toBe(false);
    expect(['UNSAFE_PAYLOAD_FIELD', 'SCHEMA_VALIDATION_FAILED']).toContain(trajectories.reasonCode);
  });

  it('rejects non-internal dataset refs and unknown model references', async () => {
    const adapter = createAdapter({ env: {} });
    const ssrf = await adapter.validateRequest(
      tenant,
      validRequest({
        payload: {
          datasetDigestSha256: DIGEST,
          approvedDatasetRef: 'https://evil.example/data',
          modelReference: 'earth-tinker-base-v0',
        },
      }),
    );
    expect(ssrf.allowed).toBe(false);
    expect(ssrf.reasonCode).toBe('SCHEMA_VALIDATION_FAILED');

    const unknownModel = await adapter.validateRequest(
      tenant,
      validRequest({
        payload: {
          datasetDigestSha256: DIGEST,
          approvedDatasetRef: 'earth://internal/datasets/approved-hdpe-v1',
          modelReference: 'https://huggingface.co/evil/model',
        },
      }),
    );
    expect(unknownModel.allowed).toBe(false);
    expect(['PROVIDER_NOT_ALLOWLISTED', 'SCHEMA_VALIDATION_FAILED']).toContain(unknownModel.reasonCode);
  });

  it('blocks RESTRICTED data at the adapter', async () => {
    const adapter = createAdapter({ env: enabledEnv(), transport: new RecordingTransport() });
    const decision = await adapter.validateRequest(
      tenant,
      validRequest({
        dataClassification: 'RESTRICTED',
        approvalReference: 'approval://durable/tinker-1',
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('RESTRICTED_DATA_BLOCKED');
  });

  it('refuses executeOperation unless health would be AVAILABLE', async () => {
    const adapter = createAdapter({ env: enabledEnv() });
    const created = await adapter.createOperation(
      tenant,
      validRequest({ approvalReference: 'approval://durable/tinker-1' }),
    );
    const executed = await adapter.executeOperation(system, created);
    expect(executed.state).toBe('NOT_CONFIGURED');
    expect(executed.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
    assertIntentNotTrained(executed);
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('cancels locally without calling the injected transport', async () => {
    const transport = new RecordingTransport();
    const adapter = createAdapter({ env: enabledEnv(), transport });
    const created = await adapter.createOperation(
      tenant,
      validRequest({ approvalReference: 'approval://durable/tinker-1' }),
    );
    const callsBefore = transport.calls.length;
    const cancelled = await adapter.cancelOperation(tenant, created.id);
    expect(cancelled.state).toBe('CANCELLED');
    expect(transport.calls.length).toBe(callsBefore);
  });

  it('does not import SessionRlPolicy, RL trainers, or cirkel-system', () => {
    const files = readdirSync(SOURCE_DIR).filter((name) => name.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(join(SOURCE_DIR, file), 'utf8');
      expect(src).not.toMatch(/SessionRlPolicy/);
      expect(src).not.toMatch(/UntrainedRlPolicy/);
      expect(src).not.toMatch(/cirkel-system/);
      expect(src).not.toMatch(/from ['"].*sovereign\/prime/);
      expect(src).not.toMatch(/globalThis\.fetch|global\.fetch/);
    }
  });

  it('registers via createAdapter on the integration registry', async () => {
    const registry = createIntegrationRegistry();
    await registry.loadOptionalAdapters();
    const adapter = registry.get('TINKER');
    expect(adapter.constructor).not.toBe(DisabledAdapter);
    expect(adapter.providerKey).toBe('TINKER');
    const status = await adapter.getStatus(tenant);
    expect(status.status).toBe('NOT_CONFIGURED');
    assertNeverConnected(status);
  });
});
