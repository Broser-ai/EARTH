import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_MODE_DEVELOPMENT, type TenantContext } from '../../../src/auth/types.js';
import { DisabledAdapter } from '../../../src/integrations/core/disabled-adapter.js';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import { createAdapter } from '../../../src/integrations/inkling/index.js';
import type { InjectedTransport } from '../../../src/integrations/inkling/transport.js';
import { createIntegrationRegistry } from '../../../src/integrations/registry.js';
import type {
  IntegrationOperation,
  IntegrationRequest,
  IntegrationSystemContext,
  ProviderHealthResult,
} from '../../../src/integrations/types.js';

const DIGEST = 'cd'.repeat(32);
const WEIGHTS_URI = 'earth://internal/fixtures/inkling-weights-not-live';
const SOURCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../src/integrations/inkling');

const tenant: TenantContext = {
  organizationId: '11111111-1111-1111-1111-111111111111',
  actorId: '22222222-2222-2222-2222-222222222222',
  role: 'OWNER',
  authMode: AUTH_MODE_DEVELOPMENT,
  correlationId: 'corr-inkling-test',
};

const system: IntegrationSystemContext = {
  correlationId: tenant.correlationId,
  actorId: tenant.actorId,
  timeoutMs: 10_000,
};

function validRequest(overrides: Partial<IntegrationRequest> = {}): IntegrationRequest {
  return {
    providerKey: 'INKLING',
    operationType: 'INKLING_POLICY_ARTIFACT_REQUEST',
    purpose: 'INKLING_POLICY_ARTIFACT_REQUEST',
    dataClassification: 'INTERNAL',
    idempotencyKey: 'inkling-intent-1',
    payload: {
      artifactDigestSha256: DIGEST,
      artifactRef: 'earth://internal/policies/inkling-artifact-v1',
    },
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
      body: { capable: true, trained: false, liveInference: false, connected: false },
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
    EARTH_INTEGRATION_INKLING_ENABLED: 'true',
    EARTH_INTEGRATION_INKLING_WEIGHTS_URI: WEIGHTS_URI,
  };
}

function assertNeverConnected(health: ProviderHealthResult): void {
  expect(health.connected).toBe(false);
  expect(health.status).not.toBe('CONNECTED');
  expect(JSON.stringify(health)).not.toContain('"connected":true');
}

function assertDraftNotTrained(operation: IntegrationOperation): void {
  const summary = (operation.safeSummary ?? '').toLowerCase();
  expect(operation.state === 'NOT_CONFIGURED' || summary.includes('draft')).toBe(true);
  expect(summary).not.toMatch(/live inference enabled/);
  expect(summary).not.toMatch(/project bonsai/);
  expect(JSON.stringify(operation).toLowerCase()).not.toContain('trained weights');
  expect(operation.state).not.toBe('SUCCEEDED');
  expect(operation.state).not.toBe('RUNNING');
}

describe('Inkling intent-only adapter', () => {
  afterEach(() => {
    providerOutboundProbe.reset();
    vi.restoreAllMocks();
  });

  it('exports createAdapter with providerKey INKLING', () => {
    const adapter = createAdapter({ env: {} });
    expect(adapter.providerKey).toBe('INKLING');
  });

  it('defaults to NOT_CONFIGURED and never CONNECTED', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('global fetch must not be used');
    });
    const adapter = createAdapter({ env: {} });
    const status = await adapter.getStatus(tenant);
    expect(status.status).toBe('NOT_CONFIGURED');
    expect(status.healthy).toBe(false);
    assertNeverConnected(status);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('does not treat a configured weights URI as available or trained', async () => {
    const adapter = createAdapter({
      env: {
        EARTH_INTEGRATION_INKLING_ENABLED: 'false',
        EARTH_INTEGRATION_INKLING_WEIGHTS_URI: WEIGHTS_URI,
      },
    });
    const status = await adapter.getStatus(tenant);
    expect(status.configured).toBe(true);
    expect(status.enabled).toBe(false);
    expect(status.status).not.toBe('AVAILABLE');
    expect(['NOT_CONFIGURED', 'DISABLED']).toContain(status.status);
    assertNeverConnected(status);
    expect(JSON.stringify(status)).not.toContain(WEIGHTS_URI);
  });

  it('returns AVAILABLE with connected false only after injected health succeeds', async () => {
    const transport = new RecordingTransport();
    const adapter = createAdapter({ env: enabledEnv(), transport });
    const health = await adapter.checkHealth(system);
    expect(health.status).toBe('AVAILABLE');
    expect(health.healthy).toBe(true);
    assertNeverConnected(health);
    expect(transport.calls.every((call) => call.url.startsWith('earth://internal/'))).toBe(true);
    expect(JSON.stringify(transport.calls)).not.toContain(WEIGHTS_URI);
  });

  it('rejects live-inference and Bonsai-style payload fields', async () => {
    const adapter = createAdapter({ env: enabledEnv(), transport: new RecordingTransport() });
    const live = await adapter.validateRequest(
      tenant,
      validRequest({
        payload: {
          artifactDigestSha256: DIGEST,
          artifactRef: 'earth://internal/policies/inkling-artifact-v1',
          liveInference: true,
        },
      }),
    );
    expect(live.allowed).toBe(false);
    expect(['UNSAFE_PAYLOAD_FIELD', 'SCHEMA_VALIDATION_FAILED']).toContain(live.reasonCode);

    const bonsai = await adapter.validateRequest(
      tenant,
      validRequest({
        payload: {
          artifactDigestSha256: DIGEST,
          artifactRef: 'earth://internal/policies/inkling-artifact-v1',
          projectBonsai: true,
        },
      }),
    );
    expect(bonsai.allowed).toBe(false);
  });

  it('rejects non-internal artifact refs', async () => {
    const adapter = createAdapter({ env: {} });
    const decision = await adapter.validateRequest(
      tenant,
      validRequest({
        payload: {
          artifactDigestSha256: DIGEST,
          artifactRef: 'file:///tmp/weights.bin',
        },
      }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('SCHEMA_VALIDATION_FAILED');
  });

  it('keeps execute output as NOT_CONFIGURED or DRAFT, never trained weights', async () => {
    const transport = new RecordingTransport();
    const adapter = createAdapter({ env: enabledEnv(), transport });
    const created = await adapter.createOperation(tenant, validRequest());
    const executed = await adapter.executeOperation(system, created);
    assertDraftNotTrained(executed);
    expect(executed.safeSummary?.toLowerCase()).toMatch(/draft|not_configured|not configured/);
    expect(executed.safeSummary?.toLowerCase()).toContain('not trained');
    expect(executed.safeSummary?.toLowerCase()).not.toContain('live inference enabled');
  });

  it('refuses executeOperation when health is not AVAILABLE', async () => {
    const adapter = createAdapter({ env: enabledEnv() });
    const created = await adapter.createOperation(tenant, validRequest());
    const executed = await adapter.executeOperation(system, created);
    expect(executed.state).toBe('NOT_CONFIGURED');
    expect(executed.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
    assertDraftNotTrained(executed);
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('blocks RESTRICTED data', async () => {
    const adapter = createAdapter({ env: enabledEnv(), transport: new RecordingTransport() });
    const decision = await adapter.validateRequest(
      tenant,
      validRequest({ dataClassification: 'RESTRICTED' }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('RESTRICTED_DATA_BLOCKED');
  });

  it('does not import SessionRlPolicy, RL, or cirkel-system', () => {
    const files = readdirSync(SOURCE_DIR).filter((name) => name.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(join(SOURCE_DIR, file), 'utf8');
      expect(src).not.toMatch(/SessionRlPolicy/);
      expect(src).not.toMatch(/UntrainedRlPolicy/);
      expect(src).not.toMatch(/from ['"].*bonsai/i);
      expect(src).not.toMatch(/cirkel-system/);
      expect(src).not.toMatch(/from ['"].*sovereign\/prime/);
      expect(src).not.toMatch(/globalThis\.fetch|global\.fetch/);
    }
  });

  it('registers via createAdapter on the integration registry', async () => {
    const registry = createIntegrationRegistry();
    await registry.loadOptionalAdapters();
    const adapter = registry.get('INKLING');
    expect(adapter.constructor).not.toBe(DisabledAdapter);
    expect(adapter.providerKey).toBe('INKLING');
    const status = await adapter.getStatus(tenant);
    expect(status.status).toBe('NOT_CONFIGURED');
    assertNeverConnected(status);
  });
});
