import { beforeEach, describe, expect, it } from 'vitest';
import { AUTH_MODE_DEVELOPMENT, type TenantContext } from '../../../src/auth/types.js';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import { createAdapter } from '../../../src/integrations/heygen/index.js';
import type { HeyGenTransport } from '../../../src/integrations/heygen/transport.js';
import type {
  IntegrationOperation,
  IntegrationRequest,
  IntegrationSystemContext,
  TenantIntegrationPolicy,
} from '../../../src/integrations/types.js';

const DIGEST = 'ab'.repeat(32);
const INTERNAL_REF = 'earth://internal/briefings/exec-2026-001';
const TEST_KEY = 'hg_test_secret_do_not_leak_xx';

function tenant(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    organizationId: '11111111-1111-1111-1111-111111111111',
    actorId: '22222222-2222-2222-2222-222222222222',
    role: 'OWNER',
    authMode: AUTH_MODE_DEVELOPMENT,
    correlationId: 'corr-heygen-test',
    ...overrides,
  };
}

function systemContext(): IntegrationSystemContext {
  return {
    correlationId: 'corr-heygen-exec',
    actorId: '22222222-2222-2222-2222-222222222222',
    timeoutMs: 5_000,
  };
}

function request(overrides: Partial<IntegrationRequest> = {}): IntegrationRequest {
  const { payload: payloadOverride, ...rest } = overrides;
  return {
    providerKey: 'HEYGEN',
    operationType: 'EXECUTIVE_VIDEO_DRAFT_REQUEST',
    purpose: 'EXECUTIVE_VIDEO_DRAFT_REQUEST',
    dataClassification: 'INTERNAL',
    idempotencyKey: 'heygen-op-1',
    payload: {
      briefingDigestSha256: DIGEST,
      briefingRef: INTERNAL_REF,
      maxChars: 280,
      ...payloadOverride,
    },
    ...rest,
  };
}

function tenantPolicy(overrides: Partial<TenantIntegrationPolicy> = {}): TenantIntegrationPolicy {
  return {
    id: 'policy-heygen-1',
    organizationId: '11111111-1111-1111-1111-111111111111',
    providerKey: 'HEYGEN',
    enabled: true,
    allowedDataClassifications: ['INTERNAL'],
    allowedPurposes: ['EXECUTIVE_VIDEO_DRAFT_REQUEST'],
    requireHumanApproval: true,
    monthlyRequestLimit: 10,
    monthlyCostLimitDkk: 100,
    ...overrides,
  };
}

function enabledEnv(): NodeJS.ProcessEnv {
  return {
    EARTH_INTEGRATION_HEYGEN_ENABLED: 'true',
    EARTH_INTEGRATION_HEYGEN_API_KEY: TEST_KEY,
  };
}

function mockTransport(
  status = 200,
  body: unknown = { ok: true, capability: 'EXECUTIVE_VIDEO_DRAFT_REQUEST' },
): { transport: HeyGenTransport; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const transport: HeyGenTransport = {
    async request(url, init) {
      providerOutboundProbe.record(url);
      calls.push({ url, init });
      return {
        status,
        async json() {
          return body;
        },
      };
    },
  };
  return { transport, calls };
}

function operation(overrides: Partial<IntegrationOperation> = {}): IntegrationOperation {
  const now = '2026-09-05T10:00:00.000Z';
  return {
    id: 'op-heygen-1',
    organizationId: '11111111-1111-1111-1111-111111111111',
    providerKey: 'HEYGEN',
    operationType: 'EXECUTIVE_VIDEO_DRAFT_REQUEST',
    state: 'REQUESTED',
    idempotencyKey: 'heygen-op-1',
    purpose: 'EXECUTIVE_VIDEO_DRAFT_REQUEST',
    dataClassification: 'INTERNAL',
    requestDigestSha256: DIGEST,
    responseDigestSha256: null,
    safeSummary: null,
    providerJobReference: null,
    requestedBy: '22222222-2222-2222-2222-222222222222',
    startedAt: null,
    completedAt: null,
    expiresAt: null,
    errorCode: null,
    correlationId: 'corr-heygen-exec',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function assertHonest(value: unknown): void {
  const text = JSON.stringify(value);
  expect(text).not.toContain(TEST_KEY);
  expect(text).not.toContain('"connected":true');
  expect(text).not.toMatch(/video generated/i);
  expect(text).not.toMatch(/"status"\s*:\s*"CONNECTED"/);
}

describe('HeyGen draft video-request adapter', () => {
  beforeEach(() => {
    providerOutboundProbe.reset();
  });

  it('exports createAdapter with providerKey HEYGEN', () => {
    const adapter = createAdapter();
    expect(adapter.providerKey).toBe('HEYGEN');
  });

  it('defaults to NOT_CONFIGURED and never CONNECTED without transport', async () => {
    const adapter = createAdapter();
    const status = await adapter.getStatus(tenant());
    const health = await adapter.checkHealth(systemContext());
    expect(status.status).toBe('NOT_CONFIGURED');
    expect(status.connected).toBe(false);
    expect(status.configured).toBe(false);
    expect(status.enabled).toBe(false);
    expect(status.healthy).toBe(false);
    expect(health.status).toBe('NOT_CONFIGURED');
    expect(health.connected).toBe(false);
    expect(providerOutboundProbe.calls).toBe(0);
    assertHonest(status);
    assertHonest(health);
  });

  it('does not call transport when a credential exists without enable or injected health', async () => {
    const { transport, calls } = mockTransport();
    const adapter = createAdapter({
      transport,
      env: { EARTH_INTEGRATION_HEYGEN_ENABLED: 'false', EARTH_INTEGRATION_HEYGEN_API_KEY: TEST_KEY },
    });
    const status = await adapter.getStatus(tenant());
    expect(status.connected).toBe(false);
    expect(status.status).not.toBe('AVAILABLE');
    expect(JSON.stringify(status)).not.toContain('CONNECTED');
    expect(calls).toHaveLength(0);
    expect(providerOutboundProbe.calls).toBe(0);
    assertHonest(status);
  });

  it('reports AVAILABLE after enable + credential + successful injected health, still not CONNECTED', async () => {
    const { transport, calls } = mockTransport();
    const adapter = createAdapter({ transport, env: enabledEnv() });
    const health = await adapter.checkHealth(systemContext());
    expect(health.status).toBe('AVAILABLE');
    expect(health.healthy).toBe(true);
    expect(health.configured).toBe(true);
    expect(health.enabled).toBe(true);
    expect(health.connected).toBe(false);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((call) => !/publish|distribute|webhook/i.test(call.url))).toBe(true);
    assertHonest(health);
  });

  it('blocks XSS / script prompts and never calls transport', async () => {
    const { transport, calls } = mockTransport();
    const adapter = createAdapter({ transport, env: enabledEnv(), tenantPolicy: tenantPolicy() });

    const prompt = await adapter.validateRequest(tenant(), request({ payload: { prompt: '<script>alert(1)</script>' } }));
    expect(prompt.allowed).toBe(false);
    expect(prompt.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');
    expect(prompt.resultingState).toBe('BLOCKED');

    const scriptRef = await adapter.validateRequest(
      tenant(),
      request({ payload: { briefingRef: 'earth://internal/<script>alert(1)</script>' } }),
    );
    expect(scriptRef.allowed).toBe(false);
    expect(scriptRef.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');

    const javascriptUri = await adapter.validateRequest(
      tenant(),
      request({ payload: { briefingRef: 'javascript:alert(1)' } }),
    );
    expect(javascriptUri.allowed).toBe(false);
    expect(javascriptUri.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');

    const onerror = await adapter.validateRequest(
      tenant(),
      request({ payload: { briefingRef: 'earth://internal/x" onerror="alert(1)' } }),
    );
    expect(onerror.allowed).toBe(false);
    expect(onerror.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');

    expect(calls).toHaveLength(0);
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('blocks PII and RESTRICTED payloads without calling transport', async () => {
    const { transport, calls } = mockTransport();
    const adapter = createAdapter({ transport, env: enabledEnv(), tenantPolicy: tenantPolicy() });

    const email = await adapter.validateRequest(
      tenant(),
      request({ payload: { briefingRef: 'earth://internal/user@example.com' } }),
    );
    expect(email.allowed).toBe(false);
    expect(email.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');

    const phone = await adapter.validateRequest(
      tenant(),
      request({ payload: { briefingRef: 'earth://internal/call-+15551234567' } }),
    );
    expect(phone.allowed).toBe(false);
    expect(phone.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');

    const restricted = await adapter.validateRequest(
      tenant(),
      request({ dataClassification: 'RESTRICTED' }),
    );
    expect(restricted.allowed).toBe(false);
    expect(restricted.reasonCode).toBe('RESTRICTED_DATA_BLOCKED');
    expect(restricted.resultingState).toBe('BLOCKED');

    expect(calls).toHaveLength(0);
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('rejects auto-publish and distribution fields', async () => {
    const { transport, calls } = mockTransport();
    const adapter = createAdapter({ transport, env: enabledEnv(), tenantPolicy: tenantPolicy() });

    for (const payload of [
      { publish: true },
      { distribute: 'slack' },
      { webhookUrl: 'https://hooks.example/heygen' },
      { channel: 'teams' },
    ]) {
      const decision = await adapter.validateRequest(tenant(), request({ payload }));
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');
      expect(decision.resultingState).toBe('BLOCKED');
    }

    expect(calls).toHaveLength(0);
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('requires durable human approval before any transport execute', async () => {
    const { transport, calls } = mockTransport();
    const adapter = createAdapter({
      transport,
      env: enabledEnv(),
      tenantPolicy: tenantPolicy(),
      approvalVerified: false,
    });
    await adapter.checkHealth(systemContext());
    expect(providerOutboundProbe.calls).toBeGreaterThan(0);
    const healthCalls = calls.length;
    providerOutboundProbe.reset();

    const executed = await adapter.executeOperation(systemContext(), operation({ state: 'QUEUED' }));
    expect(executed.errorCode).toBe('HUMAN_APPROVAL_REQUIRED');
    expect(executed.safeSummary).toMatch(/DRAFT/);
    expect(executed.safeSummary).toMatch(/HUMAN_REVIEW_REQUIRED/);
    expect(executed.safeSummary).not.toMatch(/video generated/i);
    expect(calls).toHaveLength(healthCalls);
    expect(providerOutboundProbe.calls).toBe(0);
    assertHonest(executed);
  });

  it('does not call transport on execute by default and never claims a video was generated', async () => {
    const adapter = createAdapter();
    const executed = await adapter.executeOperation(systemContext(), operation());
    expect(executed.state).toBe('NOT_CONFIGURED');
    expect(executed.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
    expect(executed.safeSummary).toMatch(/DRAFT/);
    expect(executed.safeSummary).toMatch(/HUMAN_REVIEW_REQUIRED/);
    expect(executed.safeSummary).toMatch(/NOT_CONFIGURED/);
    expect(executed.safeSummary).not.toMatch(/video generated/i);
    expect(providerOutboundProbe.calls).toBe(0);
    assertHonest(executed);
  });

  it('records a DRAFT request after approval + AVAILABLE health and still refuses publish', async () => {
    const { transport, calls } = mockTransport(200, {
      ok: true,
      video_id: 'vid_must_be_ignored',
      status: 'completed',
    });
    const adapter = createAdapter({
      transport,
      env: enabledEnv(),
      tenantPolicy: tenantPolicy(),
      approvalVerified: true,
    });
    const health = await adapter.checkHealth(systemContext());
    expect(health.status).toBe('AVAILABLE');
    expect(health.connected).toBe(false);

    const executed = await adapter.executeOperation(systemContext(), operation({ state: 'QUEUED' }));
    expect(executed.safeSummary).toMatch(/DRAFT/);
    expect(executed.safeSummary).toMatch(/HUMAN_REVIEW_REQUIRED/);
    expect(executed.safeSummary).not.toMatch(/video generated/i);
    expect(JSON.stringify(executed)).not.toContain('vid_must_be_ignored');
    expect(JSON.stringify(executed)).not.toMatch(/publish/i);
    expect(executed.connected).toBeUndefined();
    expect(calls.some((call) => /publish|distribute|webhook/i.test(call.url))).toBe(false);
    expect(calls.some((call) => /draft/i.test(call.url))).toBe(true);
    assertHonest(executed);
  });

  it('createOperation and cancelOperation never hit transport by default', async () => {
    const { transport, calls } = mockTransport();
    const adapter = createAdapter({ transport });
    const created = await adapter.createOperation(tenant(), request());
    expect(created.providerKey).toBe('HEYGEN');
    expect(created.state === 'NOT_CONFIGURED' || created.state === 'BLOCKED' || created.state === 'REQUESTED').toBe(
      true,
    );
    expect(created.safeSummary).toMatch(/DRAFT|NOT_CONFIGURED|HUMAN_REVIEW_REQUIRED/);
    expect(created.safeSummary).not.toMatch(/video generated/i);

    const cancelled = await adapter.cancelOperation(tenant(), created.id);
    expect(cancelled.state).toBe('CANCELLED');
    expect(calls).toHaveLength(0);
    expect(providerOutboundProbe.calls).toBe(0);
    assertHonest(created);
    assertHonest(cancelled);
  });
});
