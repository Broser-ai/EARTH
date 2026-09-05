import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_MODE_DEVELOPMENT } from '../../../src/auth/types.js';
import type { TenantContext } from '../../../src/auth/types.js';
import { IntegrationError } from '../../../src/integrations/core/errors.js';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import {
  createAdapter,
  defaultPrimeProjectionReader,
  type LangGraphTransport,
  type PrimeProjectionReader,
  type PrimeWorkflowProjection,
  type WorkflowVisualization,
} from '../../../src/integrations/langgraph/index.js';
import type { IntegrationOperation, IntegrationRequest } from '../../../src/integrations/types.js';
import { DEV_ORG, DEV_USER } from '../../helpers.js';

const SESSION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const tenant: TenantContext = {
  organizationId: DEV_ORG,
  actorId: DEV_USER,
  role: 'OWNER',
  authMode: AUTH_MODE_DEVELOPMENT,
  correlationId: 'corr-langgraph-adapter',
};

const systemContext = {
  correlationId: tenant.correlationId,
  actorId: tenant.actorId,
  timeoutMs: 5_000,
};

function projectionFixture(
  overrides: Partial<PrimeWorkflowProjection> = {},
): PrimeWorkflowProjection {
  return {
    sessionId: SESSION_ID,
    organizationId: DEV_ORG,
    state: 'QUEUED',
    workflowType: 'MATERIAL_OPPORTUNITY_INTAKE',
    workflowVersion: '0.1',
    tasks: [
      { id: 'task-validate', taskType: 'VALIDATE_BATCH', state: 'QUEUED', required: true, priority: 10 },
      { id: 'task-evidence', taskType: 'CHECK_EVIDENCE', state: 'QUEUED', required: true, priority: 20 },
      { id: 'task-baseline', taskType: 'CALCULATE_BASELINE', state: 'QUEUED', required: true, priority: 30 },
      {
        id: 'task-routes',
        taskType: 'FIND_CANDIDATE_ROUTES',
        state: 'QUEUED',
        required: true,
        priority: 40,
      },
      {
        id: 'task-nanochat',
        taskType: 'NANOCHAT_EXTRACT',
        state: 'NOT_CONFIGURED',
        required: false,
        priority: 50,
      },
    ],
    nextRecommendedAction: 'RUN_NEXT',
    ...overrides,
  };
}

function memoryReader(value: PrimeWorkflowProjection | null): PrimeProjectionReader {
  return {
    async read({ sessionId, organizationId }) {
      if (!value) {
        return null;
      }
      if (value.sessionId !== sessionId || value.organizationId !== organizationId) {
        return null;
      }
      return value;
    },
  };
}

function healthyTransport(): LangGraphTransport {
  return {
    async request() {
      return {
        status: 200,
        json: async () => ({
          ok: true,
          capability: 'PRIME_WORKFLOW_PROJECTION',
          llm: false,
        }),
      };
    },
  };
}

function configuredAdapter(
  reader: PrimeProjectionReader = memoryReader(projectionFixture()),
  transport: LangGraphTransport = healthyTransport(),
) {
  return createAdapter({
    transport,
    projectionReader: reader,
    env: { EARTH_INTEGRATION_LANGGRAPH_ENABLED: 'true' },
  });
}

function request(overrides: Partial<IntegrationRequest> = {}): IntegrationRequest {
  return {
    providerKey: 'LANGGRAPH',
    operationType: 'PRIME_WORKFLOW_PROJECTION',
    purpose: 'PRIME_WORKFLOW_PROJECTION',
    dataClassification: 'INTERNAL',
    idempotencyKey: 'lg-op-1',
    payload: { sessionId: SESSION_ID },
    ...overrides,
  };
}

afterEach(() => {
  providerOutboundProbe.reset();
  delete process.env.EARTH_INTEGRATION_LANGGRAPH_ENABLED;
});

describe('LangGraph createAdapter defaults', () => {
  it('exports createAdapter and defaults to NOT_CONFIGURED with connected false', async () => {
    const adapter = createAdapter();
    expect(adapter.providerKey).toBe('LANGGRAPH');
    const status = await adapter.getStatus(tenant);
    expect(status.status).toBe('NOT_CONFIGURED');
    expect(status.configured).toBe(false);
    expect(status.enabled).toBe(false);
    expect(status.healthy).toBe(false);
    expect(status.connected).toBe(false);
    expect(status.reasonCode).toBe('PROVIDER_NOT_CONFIGURED');
    expect(JSON.stringify(status)).not.toMatch(/"connected":true/);
    expect(status.status).not.toBe('CONNECTED' as typeof status.status);
  });

  it('keeps NOT_CONFIGURED when the enable flag is set but no projection reader is injected', async () => {
    const adapter = createAdapter({
      env: { EARTH_INTEGRATION_LANGGRAPH_ENABLED: 'true' },
    });
    const status = await adapter.getStatus(tenant);
    expect(status.status).toBe('NOT_CONFIGURED');
    expect(status.connected).toBe(false);
    expect(status.healthy).toBe(false);
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('uses the default projection reader which does not query Postgres', async () => {
    const read = vi.spyOn(defaultPrimeProjectionReader, 'read');
    const adapter = createAdapter({
      env: { EARTH_INTEGRATION_LANGGRAPH_ENABLED: 'true' },
      transport: healthyTransport(),
    });
    const status = await adapter.checkHealth(systemContext);
    expect(status.status).toBe('NOT_CONFIGURED');
    expect(read).not.toHaveBeenCalled();
  });

  it('does not call global fetch or the outbound probe by default', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('network is forbidden for the default LangGraph adapter');
    });
    const adapter = createAdapter();
    await adapter.getStatus(tenant);
    await adapter.checkHealth(systemContext);
    const decision = await adapter.validateRequest(tenant, request());
    expect(decision.allowed).toBe(false);
    expect(decision.resultingState).toBe('NOT_CONFIGURED');
    await expect(adapter.createOperation(tenant, request())).rejects.toBeInstanceOf(IntegrationError);
    const executed = await adapter.executeOperation(systemContext, {
      id: '00000000-0000-4000-8000-000000000001',
      organizationId: DEV_ORG,
      providerKey: 'LANGGRAPH',
      operationType: 'PRIME_WORKFLOW_PROJECTION',
      state: 'QUEUED',
      idempotencyKey: 'lg-exec-default',
      purpose: 'PRIME_WORKFLOW_PROJECTION',
      dataClassification: 'INTERNAL',
      requestDigestSha256: null,
      responseDigestSha256: null,
      safeSummary: null,
      providerJobReference: SESSION_ID,
      requestedBy: DEV_USER,
      startedAt: null,
      completedAt: null,
      expiresAt: null,
      errorCode: null,
      correlationId: tenant.correlationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(executed.state).toBe('NOT_CONFIGURED');
    expect(executed.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(providerOutboundProbe.calls).toBe(0);
    fetchSpy.mockRestore();
  });
});

describe('LangGraph injected health', () => {
  it('becomes AVAILABLE after enable + injected reader + successful mock health, never CONNECTED', async () => {
    const transport = healthyTransport();
    const requestSpy = vi.fn(transport.request.bind(transport));
    const adapter = createAdapter({
      transport: { request: requestSpy },
      projectionReader: memoryReader(projectionFixture()),
      env: { EARTH_INTEGRATION_LANGGRAPH_ENABLED: 'true' },
    });
    const health = await adapter.checkHealth(systemContext);
    expect(health.status).toBe('AVAILABLE');
    expect(health.healthy).toBe(true);
    expect(health.enabled).toBe(true);
    expect(health.configured).toBe(true);
    expect(health.connected).toBe(false);
    expect(health.status).not.toBe('CONNECTED' as typeof health.status);
    expect(JSON.stringify(health)).not.toMatch(/"connected":true/);
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(providerOutboundProbe.calls).toBe(1);
  });

  it('stays NOT_CONFIGURED when mock health reports an LLM capability', async () => {
    const adapter = createAdapter({
      projectionReader: memoryReader(projectionFixture()),
      env: { EARTH_INTEGRATION_LANGGRAPH_ENABLED: 'true' },
      transport: {
        async request() {
          return {
            status: 200,
            json: async () => ({ ok: true, capability: 'PRIME_WORKFLOW_PROJECTION', llm: true }),
          };
        },
      },
    });
    const health = await adapter.checkHealth(systemContext);
    expect(health.status).toBe('NOT_CONFIGURED');
    expect(health.healthy).toBe(false);
    expect(health.connected).toBe(false);
  });
});

describe('LangGraph request validation and projection', () => {
  it('accepts only { sessionId } UUID payloads', async () => {
    const adapter = configuredAdapter();
    const ok = await adapter.validateRequest(tenant, request());
    expect(ok.allowed).toBe(true);
    expect(ok.providerStatus).toBe('AVAILABLE');

    const missing = await adapter.validateRequest(tenant, request({ payload: {} }));
    expect(missing.allowed).toBe(false);
    expect(missing.reasonCode).toBe('SCHEMA_VALIDATION_FAILED');

    const extra = await adapter.validateRequest(
      tenant,
      request({ payload: { sessionId: SESSION_ID, transition: 'RUNNING' } }),
    );
    expect(extra.allowed).toBe(false);
    expect(extra.reasonCode).toBe('SCHEMA_VALIDATION_FAILED');

    const unsafe = await adapter.validateRequest(
      tenant,
      request({ payload: { sessionId: SESSION_ID, prompt: 'free-form agent' } }),
    );
    expect(unsafe.allowed).toBe(false);
    expect(unsafe.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');
  });

  it('refuses executeOperation unless health would be AVAILABLE', async () => {
    const adapter = createAdapter({
      projectionReader: memoryReader(projectionFixture()),
      env: { EARTH_INTEGRATION_LANGGRAPH_ENABLED: 'true' },
    });
    const executed = await adapter.executeOperation(systemContext, await queuedOperation());
    expect(executed.state).toBe('NOT_CONFIGURED');
    expect(executed.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
  });

  it('produces a deterministic DRAFT visualization and never executes a PRIME transition', async () => {
    const adapter = configuredAdapter();
    const created = await adapter.createOperation(tenant, request());
    expect(created.providerKey).toBe('LANGGRAPH');
    expect(created.providerJobReference).toBe(SESSION_ID);
    const executed = await adapter.executeOperation(systemContext, created);
    expect(executed.state).toBe('SUCCEEDED');
    expect(executed.errorCode).toBeNull();
    const visualization = JSON.parse(executed.safeSummary ?? '') as WorkflowVisualization;
    expect(visualization.status).toBe('DRAFT');
    expect(visualization.honesty).toBe('INPUT_UNVERIFIED');
    expect(visualization.connected).toBe(false);
    expect(visualization.transitionRequest).toEqual({
      action: 'REQUIRES_PRIME_API',
      path: `/v1/sessions/${SESSION_ID}/run-next`,
    });
    const kinds = visualization.graph.nodes.map((node) => node.kind);
    expect(kinds).toContain('SESSION');
    expect(kinds).toContain('TASK');
    expect(kinds).not.toContain('LLM');
    expect(JSON.stringify(visualization)).not.toMatch(/llm/i);
    expect(JSON.stringify(visualization)).not.toMatch(/agent message/i);
    const sessionNode = visualization.graph.nodes.find((node) => node.kind === 'SESSION');
    expect(sessionNode?.state).toBe('QUEUED');
    expect(visualization.graph.edges.length).toBeGreaterThan(0);

    const again = await adapter.executeOperation(systemContext, created);
    expect(JSON.parse(again.safeSummary ?? '')).toEqual(visualization);
  });

  it('represents WAITING_FOR_APPROVAL as a gate and still requires the PRIME API', async () => {
    const adapter = configuredAdapter(
      memoryReader(projectionFixture({ state: 'WAITING_FOR_APPROVAL' })),
    );
    const executed = await adapter.executeOperation(systemContext, await queuedOperation());
    const visualization = JSON.parse(executed.safeSummary ?? '') as WorkflowVisualization;
    expect(visualization.graph.nodes.some((node) => node.state === 'WAITING_FOR_APPROVAL')).toBe(
      true,
    );
    expect(visualization.transitionRequest.action).toBe('REQUIRES_PRIME_API');
    expect(visualization.transitionRequest.path).toBe(`/v1/sessions/${SESSION_ID}/run-next`);
  });
});

describe('LangGraph adapter source contract', () => {
  it('does not mutate SQL, import PrimeService, LangChain, or persist to localStorage', () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '../../../src/integrations/langgraph');
    const files = readdirSync(dir).filter((name) => name.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const text = readFileSync(join(dir, name), 'utf8');
      expect(text, name).not.toMatch(/\bINSERT\b/);
      expect(text, name).not.toMatch(/\bUPDATE\b/);
      expect(text, name).not.toMatch(/\bDELETE\b/);
      expect(text, name).not.toMatch(/PrimeService/);
      expect(text, name).not.toMatch(/@langchain/);
      expect(text, name).not.toMatch(/sovereign/);
      expect(text, name).not.toMatch(/localStorage/);
      expect(text, name).not.toMatch(/sessionStorage/);
    }
    expect(Object.keys(defaultPrimeProjectionReader)).toEqual(['read']);
    expect(defaultPrimeProjectionReader).not.toHaveProperty('write');
  });
});

async function queuedOperation(): Promise<IntegrationOperation> {
  return {
    id: '00000000-0000-4000-8000-000000000099',
    organizationId: DEV_ORG,
    providerKey: 'LANGGRAPH',
    operationType: 'PRIME_WORKFLOW_PROJECTION',
    state: 'QUEUED',
    idempotencyKey: 'lg-queued',
    purpose: 'PRIME_WORKFLOW_PROJECTION',
    dataClassification: 'INTERNAL',
    requestDigestSha256: null,
    responseDigestSha256: null,
    safeSummary: null,
    providerJobReference: SESSION_ID,
    requestedBy: DEV_USER,
    startedAt: null,
    completedAt: null,
    expiresAt: null,
    errorCode: null,
    correlationId: tenant.correlationId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
