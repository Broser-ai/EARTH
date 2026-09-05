import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IntegrationError } from '../../../src/integrations/core/errors.js';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import type { IntegrationOperation, IntegrationRequest } from '../../../src/integrations/types.js';
import {
  createMockAdapter,
  createPrimeProjectionGuard,
  heygenPublishDecision,
  HF_MODEL_ALLOWLIST,
  isAllowlistedHfModel,
  loadContractAdapter,
  roboflowReviewDecision,
  tinkerInklingJobContract,
} from '../../helpers/integration-mocks.js';
import {
  assertNeverVerified,
  assertNoConnected,
  assertNoOutboundHttp,
  contractTenant,
  installForbiddenFetch,
  PROVIDER_CONTRACTS,
} from '../../helpers/integration-security.js';

function requestFor(
  providerKey: IntegrationRequest['providerKey'],
  overrides: Partial<IntegrationRequest> = {},
): IntegrationRequest {
  const fixture = PROVIDER_CONTRACTS.find((row) => row.providerKey === providerKey);
  if (!fixture) {
    throw new Error(`missing fixture for ${providerKey}`);
  }
  return {
    providerKey,
    operationType: fixture.operationType,
    purpose: fixture.purpose,
    dataClassification: 'INTERNAL',
    idempotencyKey: `${providerKey}-mock`,
    payload: { ...fixture.payload },
    ...overrides,
  };
}

function sampleOperation(providerKey: IntegrationRequest['providerKey']): IntegrationOperation {
  const now = new Date().toISOString();
  const fixture = PROVIDER_CONTRACTS.find((row) => row.providerKey === providerKey);
  if (!fixture) {
    throw new Error(`missing fixture for ${providerKey}`);
  }
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    organizationId: '11111111-1111-1111-1111-111111111111',
    providerKey,
    operationType: fixture.operationType,
    state: 'REQUESTED',
    idempotencyKey: `${providerKey}-exec`,
    purpose: fixture.purpose,
    dataClassification: 'INTERNAL',
    requestDigestSha256: null,
    responseDigestSha256: null,
    safeSummary: null,
    providerJobReference: null,
    requestedBy: '22222222-2222-2222-2222-222222222222',
    startedAt: null,
    completedAt: null,
    expiresAt: null,
    errorCode: null,
    correlationId: 'integration-contract',
    createdAt: now,
    updatedAt: now,
  };
}

const healthy = { enabled: true, credentialPresent: true, healthOk: true } as const;

describe('adapter security mocks', () => {
  let fetchGuard: ReturnType<typeof installForbiddenFetch>;

  beforeEach(() => {
    providerOutboundProbe.reset();
    fetchGuard = installForbiddenFetch();
  });

  afterEach(() => {
    fetchGuard.restore();
  });

  it.each(PROVIDER_CONTRACTS)(
    '$providerKey default mock is NOT_CONFIGURED and refuses execute/create',
    async (fixture) => {
      const loaded = await loadContractAdapter(fixture.providerKey);
      const adapter = loaded.source === 'real' ? loaded.adapter : createMockAdapter(fixture.providerKey);
      const tenant = contractTenant();
      const status = await adapter.getStatus(tenant);
      expect(status.status).toBe('NOT_CONFIGURED');
      expect(status.connected).toBe(false);
      expect(status.healthy).toBe(false);
      assertNoConnected(status);

      const executed = await adapter.executeOperation(
        { correlationId: 'c', actorId: tenant.actorId, timeoutMs: 1000 },
        sampleOperation(fixture.providerKey),
      );
      expect(executed.state).toBe('NOT_CONFIGURED');
      expect(executed.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
      assertNeverVerified(executed);
      assertNoOutboundHttp();
      expect(fetchGuard.calls).toEqual([]);

      await expect(adapter.createOperation(tenant, requestFor(fixture.providerKey))).rejects.toBeInstanceOf(
        IntegrationError,
      );
    },
  );

  it('Roboflow low confidence is ABSTAINED / REQUIRES_HUMAN_REVIEW and never VERIFIED', async () => {
    expect(roboflowReviewDecision(0.12)).toEqual({
      outcome: 'ABSTAINED',
      reason: 'REQUIRES_HUMAN_REVIEW',
      claimStatus: 'INPUT_UNVERIFIED',
    });
    const adapter = createMockAdapter('ROBOFLOW', healthy);
    await adapter.validateRequest(
      contractTenant(),
      requestFor('ROBOFLOW', { payload: { objectStorageRef: 'earth://internal/img-1', confidence: 0.12 } }),
    );
    const executed = await adapter.executeOperation(
      { correlationId: 'c', actorId: contractTenant().actorId, timeoutMs: 1000 },
      sampleOperation('ROBOFLOW'),
    );
    expect(executed.errorCode).toBe('REQUIRES_HUMAN_REVIEW');
    expect(executed.safeSummary).toMatch(/ABSTAINED/);
    expect(executed.safeSummary).toMatch(/INPUT_UNVERIFIED/);
    assertNeverVerified(executed);
    assertNoOutboundHttp();
  });

  it('Hugging Face rejects model IDs outside the allow-list including https URLs', async () => {
    expect(isAllowlistedHfModel(HF_MODEL_ALLOWLIST[0])).toBe(true);
    expect(isAllowlistedHfModel('meta-llama/Llama-3-70b')).toBe(false);
    expect(isAllowlistedHfModel('https://huggingface.co/evil/model')).toBe(false);

    const adapter = createMockAdapter('HUGGINGFACE', healthy);
    const tenant = contractTenant();
    const rejected = await adapter.validateRequest(
      tenant,
      requestFor('HUGGINGFACE', { payload: { modelId: 'gpt2' } }),
    );
    expect(rejected.allowed).toBe(false);
    expect(rejected.reasonCode).toBe('SCHEMA_VALIDATION_FAILED');

    const urlRejected = await adapter.validateRequest(
      tenant,
      requestFor('HUGGINGFACE', { payload: { modelId: 'https://evil.example/model' } }),
    );
    expect(urlRejected.allowed).toBe(false);
    assertNoOutboundHttp();
  });

  it('Tinker and Inkling job intent is not trained or completed', async () => {
    expect(tinkerInklingJobContract()).toEqual({ trained: false, completed: false, intentOnly: true });
    for (const providerKey of ['TINKER', 'INKLING'] as const) {
      const adapter = createMockAdapter(providerKey, healthy);
      const executed = await adapter.executeOperation(
        { correlationId: 'c', actorId: contractTenant().actorId, timeoutMs: 1000 },
        sampleOperation(providerKey),
      );
      expect(executed.state).toBe('REQUESTED');
      expect(executed.safeSummary).toMatch(/trained=false/);
      expect(executed.safeSummary).toMatch(/completed=false/);
      expect(executed.safeSummary).not.toMatch(/trained=true|completed=true/);
      assertNeverVerified(executed);
    }
    assertNoOutboundHttp();
  });

  it('HeyGen blocks PII/RESTRICTED and never auto-publishes', async () => {
    expect(heygenPublishDecision()).toEqual({ published: false, autoPublish: false, status: 'DRAFT' });
    const adapter = createMockAdapter('HEYGEN', healthy);
    const tenant = contractTenant();

    const restricted = await adapter.validateRequest(
      tenant,
      requestFor('HEYGEN', { dataClassification: 'RESTRICTED' }),
    );
    expect(restricted.allowed).toBe(false);
    expect(restricted.reasonCode).toBe('RESTRICTED_DATA_BLOCKED');

    const pii = await adapter.validateRequest(
      tenant,
      requestFor('HEYGEN', { payload: { scriptRef: 'earth://internal/script-draft', speakerEmail: 'ceo@example.com' } }),
    );
    expect(pii.allowed).toBe(false);

    await adapter.validateRequest(tenant, requestFor('HEYGEN'));
    const executed = await adapter.executeOperation(
      { correlationId: 'c', actorId: tenant.actorId, timeoutMs: 1000 },
      sampleOperation('HEYGEN'),
    );
    expect(executed.safeSummary).toMatch(/autoPublish=false/);
    expect(executed.safeSummary).toMatch(/published=false/);
    expect(executed.safeSummary).toMatch(/DRAFT/);
    expect(executed.state).not.toBe('SUCCEEDED');
    assertNeverVerified(executed);
    assertNoOutboundHttp();
  });

  it('LangGraph projection reader never writes PRIME state', async () => {
    const guard = createPrimeProjectionGuard();
    const adapter = createMockAdapter('LANGGRAPH', { ...healthy, projectionGuard: guard });
    const executed = await adapter.executeOperation(
      { correlationId: 'c', actorId: contractTenant().actorId, timeoutMs: 1000 },
      sampleOperation('LANGGRAPH'),
    );
    expect(guard.reads).toBe(1);
    expect(guard.writes).toBe(0);
    expect(executed.safeSummary).toMatch(/read-only/i);
    assertNeverVerified(executed);
    assertNoOutboundHttp();
  });

  it('injected mock transport is the only HTTP path and default transport stays silent', async () => {
    const transportCalls: string[] = [];
    const adapter = createMockAdapter('ROBOFLOW', {
      ...healthy,
      transport: {
        fetch: (async (input: RequestInfo | URL) => {
          transportCalls.push(String(input));
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }) as typeof fetch,
      },
    });
    await adapter.checkHealth({ correlationId: 'c', actorId: 'actor', timeoutMs: 1000 });
    expect(transportCalls).toHaveLength(1);
    expect(providerOutboundProbe.calls).toBe(1);
    expect(transportCalls[0]).toMatch(/^https:\/\/mock\.local\//);
    expect(fetchGuard.calls).toEqual([]);
  });
});
