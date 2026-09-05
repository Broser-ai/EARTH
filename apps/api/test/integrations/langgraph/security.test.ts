import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { providerOutboundProbe } from '../../../src/integrations/core/probe.js';
import {
  createAdapter,
  type PrimeProjectionReader,
  type PrimeWorkflowProjection,
  type WorkflowVisualization,
} from '../../../src/integrations/langgraph/index.js';
import type { SessionState, TaskState, TaskType } from '../../../src/prime/types.js';
import {
  createPool,
  createTestApp,
  demoBody,
  DEV_ORG,
  DEV_USER,
  devHeaders,
  otherHeaders,
  resetWorkflowTables,
  viewerHeaders,
} from '../../helpers.js';

const systemContext = {
  correlationId: 'corr-langgraph-security',
  actorId: DEV_USER,
  timeoutMs: 5_000,
};

describe('LangGraph control-plane gates (RBAC / tenant)', () => {
  let pool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
    pool = await createPool();
    app = await createTestApp(pool);
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    providerOutboundProbe.reset();
    await pool.query('TRUNCATE integration_operations, tenant_integration_policies');
    await pool.query(`DELETE FROM audit_events WHERE event_type LIKE 'INTEGRATION_%'`);
  });

  it('registers via createAdapter and still reports NOT_CONFIGURED over HTTP', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/integrations/LANGGRAPH/status',
      headers: devHeaders,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { status: string; connected: boolean; reasonCode: string };
    expect(body.status).toBe('NOT_CONFIGURED');
    expect(body.connected).toBe(false);
    expect(body.reasonCode).toBe('PROVIDER_NOT_CONFIGURED');
    expect(JSON.stringify(body)).not.toMatch(/"connected":true/);
  });

  it('blocks VIEWER from creating LANGGRAPH operations', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/LANGGRAPH/operations',
      headers: viewerHeaders,
      payload: {
        operationType: 'PRIME_WORKFLOW_PROJECTION',
        purpose: 'PRIME_WORKFLOW_PROJECTION',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'lg-viewer',
        payload: { sessionId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
      },
    });
    expect(created.statusCode).toBe(403);
    expect(created.json().error.code).toBe('ROLE_FORBIDDEN');
    expect(providerOutboundProbe.calls).toBe(0);
  });

  it('does not leak tenant A operations to tenant B', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/integrations/LANGGRAPH/operations',
      headers: devHeaders,
      payload: {
        operationType: 'PRIME_WORKFLOW_PROJECTION',
        purpose: 'PRIME_WORKFLOW_PROJECTION',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'lg-tenant-a',
        payload: { sessionId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
      },
    });
    expect(created.statusCode).toBe(201);
    const operationId = created.json().operation.id as string;
    const other = await app.inject({
      method: 'GET',
      url: `/v1/integration-operations/${operationId}`,
      headers: otherHeaders,
    });
    expect(other.statusCode).toBe(404);
    expect(other.json().error.code).toBe('OPERATION_NOT_FOUND');
  });

  it('blocks RESTRICTED data and missing tenant policy without executing', async () => {
    const restricted = await app.inject({
      method: 'POST',
      url: '/v1/integrations/LANGGRAPH/operations',
      headers: devHeaders,
      payload: {
        operationType: 'PRIME_WORKFLOW_PROJECTION',
        purpose: 'PRIME_WORKFLOW_PROJECTION',
        dataClassification: 'RESTRICTED',
        idempotencyKey: 'lg-restricted',
        payload: { sessionId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
      },
    });
    expect(restricted.json().operation.state).toBe('BLOCKED');
    expect(restricted.json().operation.errorCode).toBe('RESTRICTED_DATA_BLOCKED');

    const missing = await app.inject({
      method: 'POST',
      url: '/v1/integrations/LANGGRAPH/operations',
      headers: devHeaders,
      payload: {
        operationType: 'PRIME_WORKFLOW_PROJECTION',
        purpose: 'PRIME_WORKFLOW_PROJECTION',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'lg-no-policy',
        payload: { sessionId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
      },
    });
    expect(missing.json().operation.state).toBe('BLOCKED');
    expect(missing.json().operation.errorCode).toBe('TENANT_POLICY_MISSING');
    expect(providerOutboundProbe.calls).toBe(0);
  });
});

describe('LangGraph cannot bypass human approval on the control plane', () => {
  let pool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.EARTH_INTEGRATION_LANGGRAPH_ENABLED = 'true';
    pool = await createPool();
    app = await createTestApp(pool);
  });

  afterAll(async () => {
    delete process.env.EARTH_INTEGRATION_LANGGRAPH_ENABLED;
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    providerOutboundProbe.reset();
    await pool.query('TRUNCATE integration_operations, tenant_integration_policies');
    await pool.query(`DELETE FROM audit_events WHERE event_type LIKE 'INTEGRATION_%'`);
  });

  it('keeps operations REQUESTED when durable approval is required', async () => {
    await pool.query(
      `INSERT INTO tenant_integration_policies (
         id, organization_id, provider_key, enabled,
         allowed_data_classifications, allowed_purposes, require_human_approval
       ) VALUES (
         gen_random_uuid(), $1, 'LANGGRAPH', true,
         ARRAY['INTERNAL']::text[], ARRAY['PRIME_WORKFLOW_PROJECTION']::text[], true
       )`,
      [DEV_ORG],
    );
    const response = await app.inject({
      method: 'POST',
      url: '/v1/integrations/LANGGRAPH/operations',
      headers: devHeaders,
      payload: {
        operationType: 'PRIME_WORKFLOW_PROJECTION',
        purpose: 'PRIME_WORKFLOW_PROJECTION',
        dataClassification: 'INTERNAL',
        idempotencyKey: 'lg-approval',
        payload: { sessionId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().operation.state).toBe('REQUESTED');
    expect(response.json().operation.errorCode).toBe('HUMAN_APPROVAL_REQUIRED');
    expect(response.json().connected).toBe(false);
    expect(providerOutboundProbe.calls).toBe(0);

    const status = await app.inject({
      method: 'GET',
      url: '/v1/integrations/LANGGRAPH/status',
      headers: devHeaders,
    });
    expect(status.json().status).toBe('NOT_CONFIGURED');
    expect(status.json().enabled).toBe(true);
    expect(status.json().connected).toBe(false);
  });
});

describe('LangGraph injected reader is read-only and cannot transition PRIME', () => {
  let pool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
    pool = await createPool();
    app = await createTestApp(pool);
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    providerOutboundProbe.reset();
    await resetWorkflowTables(pool);
  });

  it('projects a live session without changing session or task state', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'lg-session-mutate' },
    });
    expect(started.statusCode).toBe(201);
    const sessionId = started.json().session.id as string;
    const before = await snapshotSession(pool, sessionId);

    const reader = createSelectOnlyReader(pool);
    expect(Object.keys(reader)).toEqual(['read']);
    expect(reader).not.toHaveProperty('write');
    expect(reader).not.toHaveProperty('runNext');

    const adapter = createAdapter({
      projectionReader: reader,
      transport: {
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
      },
      env: { EARTH_INTEGRATION_LANGGRAPH_ENABLED: 'true' },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('adapter must not fetch PRIME or LangGraph HTTP');
    });

    const executed = await adapter.executeOperation(systemContext, {
      id: '00000000-0000-4000-8000-000000000123',
      organizationId: DEV_ORG,
      providerKey: 'LANGGRAPH',
      operationType: 'PRIME_WORKFLOW_PROJECTION',
      state: 'QUEUED',
      idempotencyKey: 'lg-project-live',
      purpose: 'PRIME_WORKFLOW_PROJECTION',
      dataClassification: 'INTERNAL',
      requestDigestSha256: null,
      responseDigestSha256: null,
      safeSummary: null,
      providerJobReference: sessionId,
      requestedBy: DEV_USER,
      startedAt: null,
      completedAt: null,
      expiresAt: null,
      errorCode: null,
      correlationId: systemContext.correlationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(executed.state).toBe('SUCCEEDED');
    const visualization = JSON.parse(executed.safeSummary ?? '') as WorkflowVisualization;
    expect(visualization.status).toBe('DRAFT');
    expect(visualization.honesty).toBe('INPUT_UNVERIFIED');
    expect(visualization.transitionRequest).toEqual({
      action: 'REQUIRES_PRIME_API',
      path: `/v1/sessions/${sessionId}/run-next`,
    });

    const after = await snapshotSession(pool, sessionId);
    expect(after).toEqual(before);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does not resume a WAITING_FOR_APPROVAL session', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'lg-waiting-approval' },
    });
    const sessionId = started.json().session.id as string;
    await pool.query(
      `UPDATE execution_sessions SET state = 'WAITING_FOR_APPROVAL', state_version = state_version + 1
       WHERE id = $1 AND organization_id = $2`,
      [sessionId, DEV_ORG],
    );
    const before = await snapshotSession(pool, sessionId);
    expect(before.state).toBe('WAITING_FOR_APPROVAL');

    const adapter = createAdapter({
      projectionReader: createSelectOnlyReader(pool),
      transport: {
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
      },
      env: { EARTH_INTEGRATION_LANGGRAPH_ENABLED: 'true' },
    });

    const executed = await adapter.executeOperation(systemContext, {
      id: '00000000-0000-4000-8000-000000000124',
      organizationId: DEV_ORG,
      providerKey: 'LANGGRAPH',
      operationType: 'PRIME_WORKFLOW_PROJECTION',
      state: 'QUEUED',
      idempotencyKey: 'lg-project-approval',
      purpose: 'PRIME_WORKFLOW_PROJECTION',
      dataClassification: 'INTERNAL',
      requestDigestSha256: null,
      responseDigestSha256: null,
      safeSummary: null,
      providerJobReference: sessionId,
      requestedBy: DEV_USER,
      startedAt: null,
      completedAt: null,
      expiresAt: null,
      errorCode: null,
      correlationId: systemContext.correlationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const visualization = JSON.parse(executed.safeSummary ?? '') as WorkflowVisualization;
    expect(visualization.transitionRequest.action).toBe('REQUIRES_PRIME_API');
    expect(visualization.graph.nodes.some((node) => node.state === 'WAITING_FOR_APPROVAL')).toBe(
      true,
    );

    const after = await snapshotSession(pool, sessionId);
    expect(after.state).toBe('WAITING_FOR_APPROVAL');
    expect(after.stateVersion).toBe(before.stateVersion);
    expect(after.taskStates).toEqual(before.taskStates);
    expect(after.auditCount).toBe(before.auditCount);
  });
});

function createSelectOnlyReader(pool: Pool): PrimeProjectionReader {
  return {
    async read({ sessionId, organizationId }): Promise<PrimeWorkflowProjection | null> {
      const session = await pool.query<{
        id: string;
        state: SessionState;
        workflow_type: string;
        workflow_version: string;
      }>(
        `SELECT id, state, workflow_type, workflow_version
         FROM execution_sessions
         WHERE id = $1 AND organization_id = $2`,
        [sessionId, organizationId],
      );
      const row = session.rows[0];
      if (!row) {
        return null;
      }
      const tasks = await pool.query<{
        id: string;
        task_type: TaskType;
        state: TaskState;
        required: boolean;
        priority: number;
      }>(
        `SELECT id, task_type, state, required, priority
         FROM execution_tasks
         WHERE session_id = $1 AND organization_id = $2
         ORDER BY priority ASC, task_type ASC`,
        [sessionId, organizationId],
      );
      return {
        sessionId: row.id,
        organizationId,
        state: row.state,
        workflowType: row.workflow_type,
        workflowVersion: row.workflow_version,
        tasks: tasks.rows.map((task) => ({
          id: task.id,
          taskType: task.task_type,
          state: task.state,
          required: task.required,
          priority: task.priority,
        })),
        nextRecommendedAction: 'RUN_NEXT',
      };
    },
  };
}

async function snapshotSession(pool: Pool, sessionId: string) {
  const session = await pool.query<{ state: string; state_version: number }>(
    `SELECT state, state_version FROM execution_sessions WHERE id = $1`,
    [sessionId],
  );
  const tasks = await pool.query<{ id: string; state: string }>(
    `SELECT id, state FROM execution_tasks WHERE session_id = $1 ORDER BY id`,
    [sessionId],
  );
  const audits = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM audit_events WHERE session_id = $1`,
    [sessionId],
  );
  return {
    state: session.rows[0]?.state,
    stateVersion: session.rows[0]?.state_version,
    taskStates: tasks.rows,
    auditCount: Number(audits.rows[0]?.count ?? 0),
  };
}
