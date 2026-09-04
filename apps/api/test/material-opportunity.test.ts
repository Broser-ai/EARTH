import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { assertSessionTransition } from '../src/prime/state-machine.js';
import { PolicyError } from '../src/prime/types.js';
import {
  createPool,
  createTestApp,
  demoBody,
  DEV_ORG,
  devHeaders,
  drainSession,
  otherHeaders,
  resetWorkflowTables,
} from './helpers.js';

describe('MATERIAL_OPPORTUNITY_INTAKE v0.1', () => {
  let pool: Pool;
  let app: FastifyInstance;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    pool = await createPool();
    app = await createTestApp(pool);
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await resetWorkflowTables(pool);
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('external fetch is forbidden in MATERIAL_OPPORTUNITY_INTAKE v0.1 tests');
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('rejects invalid quantity', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: {
        ...demoBody,
        idempotencyKey: 'invalid-qty',
        materialBatch: { ...demoBody.materialBatch, quantityKg: 0 },
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().mode).toBe('DEVELOPMENT_ONLY');
    expect(response.json().error.code).toBe('INVALID_QUANTITY');
  });

  it('rejects missing material class', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: {
        ...demoBody,
        idempotencyKey: 'missing-class',
        materialBatch: { ...demoBody.materialBatch, materialClass: '   ' },
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().mode).toBe('DEVELOPMENT_ONLY');
    expect(response.json().error.code).toBe('MATERIAL_CLASS_REQUIRED');
  });

  it('returns the original session for a repeated idempotency key', async () => {
    const payload = { ...demoBody, idempotencyKey: 'idem-1' };
    const first = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload,
    });
    const second = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload,
    });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(first.json().mode).toBe('DEVELOPMENT_ONLY');
    expect(second.json().session.id).toBe(first.json().session.id);
    const count = await pool.query(
      `SELECT count(*)::int AS n FROM execution_sessions WHERE organization_id = $1`,
      [DEV_ORG],
    );
    expect(count.rows[0].n).toBe(1);
  });

  it('does not create a NanoChat task for RESTRICTED data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: {
        ...demoBody,
        idempotencyKey: 'restricted-nano',
        dataClassification: 'RESTRICTED',
        evidence: { documentIds: [], extractionRequested: true },
      },
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.mode).toBe('DEVELOPMENT_ONLY');
    expect(body.session.reasonCodes).toContain('NANOCHAT_RESTRICTED_DATA_BLOCK');
    expect(body.tasks.map((task: { taskType: string }) => task.taskType)).not.toContain(
      'NANOCHAT_EXTRACT',
    );
  });

  it('creates NanoChat as NOT_CONFIGURED when extraction is requested without an adapter', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: {
        ...demoBody,
        idempotencyKey: 'nano-optional',
        evidence: { documentIds: ['doc-1'], extractionRequested: true },
      },
    });
    const nano = response.json().tasks.find((task: { taskType: string }) => task.taskType === 'NANOCHAT_EXTRACT');
    expect(nano).toBeTruthy();
    expect(nano.state).toBe('NOT_CONFIGURED');
    expect(nano.required).toBe(false);
    expect(response.json().session.reasonCodes).toContain('NANOCHAT_NOT_CONFIGURED');
  });

  it('does not create a NanoChat task when extraction is not requested', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: demoBody,
    });
    expect(response.json().tasks.map((task: { taskType: string }) => task.taskType)).not.toContain(
      'NANOCHAT_EXTRACT',
    );
  });

  it('goes WAITING_FOR_DEPENDENCY when no document IDs are provided', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'no-docs' },
    });
    expect(start.json().mode).toBe('DEVELOPMENT_ONLY');
    expect(start.json().session.state).toBe('RUNNING');
    expect(start.json().session.reasonCodes).toContain('EVIDENCE_MISSING');
    expect(start.json().nextRecommendedAction).toBe('UPLOAD_EVIDENCE');

    const drained = await drainSession(app, start.json().session.id);
    const body = drained.json();
    expect(body.mode).toBe('DEVELOPMENT_ONLY');
    expect(body.session.state).toBe('WAITING_FOR_DEPENDENCY');
    expect(body.session.reasonCodes).toContain('EVIDENCE_MISSING');
  });

  it('does not call external integrations', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'no-external' },
    });
    await drainSession(app, start.json().session.id);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('writes an audit event when a task executes', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'audit-task' },
    });
    const sessionId = start.json().session.id;
    const run = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(run.json().claimedTask).toBeTruthy();
    expect(run.json().mode).toBe('DEVELOPMENT_ONLY');

    const audit = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: devHeaders,
    });
    expect(audit.json().mode).toBe('DEVELOPMENT_ONLY');
    const types = audit.json().events.map((event: { eventType: string }) => event.eventType);
    expect(types).toContain('TASK_CLAIMED');
    expect(types).toContain('TASK_STATE_CHANGED');
    expect(audit.json().events.every((event: { policyVersion: string }) => event.policyVersion === 'prime-v0.1')).toBe(
      true,
    );
  });

  it('rejects invalid state transitions', () => {
    expect(() => assertSessionTransition('COMPLETED', 'RUNNING')).toThrow(PolicyError);
    try {
      assertSessionTransition('FAILED', 'QUEUED');
    } catch (error) {
      expect(error).toBeInstanceOf(PolicyError);
      expect((error as PolicyError).code).toBe('INVALID_STATE_TRANSITION');
    }
  });

  it('rejects run-next on a completed session', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: {
        ...demoBody,
        idempotencyKey: 'complete-then-run',
        evidence: { documentIds: ['doc-1'], extractionRequested: false },
      },
    });
    const drained = await drainSession(app, start.json().session.id);
    expect(drained.json().session.state).toBe('COMPLETED');

    const again = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${start.json().session.id}/run-next`,
      headers: devHeaders,
    });
    expect(again.statusCode).toBe(409);
    expect(again.json().mode).toBe('DEVELOPMENT_ONLY');
    expect(again.json().error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('does not let one organization fetch another organization session', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'org-a' },
    });
    const sessionId = start.json().session.id;

    const stolen = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}`,
      headers: otherHeaders,
    });
    expect(stolen.statusCode).toBe(404);
    expect(stolen.json().mode).toBe('DEVELOPMENT_ONLY');

    const stolenAudit = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: otherHeaders,
    });
    expect(stolenAudit.statusCode).toBe(404);
    expect(stolenAudit.json().mode).toBe('DEVELOPMENT_ONLY');

    const stolenRun = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: otherHeaders,
    });
    expect(stolenRun.statusCode).toBe(404);
    expect(stolenRun.json().mode).toBe('DEVELOPMENT_ONLY');
  });

  it('labels all returned carbon/baseline values INPUT_UNVERIFIED', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: {
        ...demoBody,
        idempotencyKey: 'unverified-baseline',
        evidence: { documentIds: ['doc-1'], extractionRequested: false },
      },
    });
    const drained = await drainSession(app, start.json().session.id);
    const baseline = drained.json().tasks.find(
      (task: { taskType: string }) => task.taskType === 'CALCULATE_BASELINE',
    );
    expect(baseline.state).toBe('COMPLETED');
    expect(baseline.output.label).toBe('INPUT_UNVERIFIED');
    expect(baseline.output.verified).toBe(false);
    expect(baseline.output.source).toBe('user-provided');
    expect(baseline.output.disposalCostDkk).toBe(38400);
    expect(baseline.output.co2eKg).toBe(4800);
  });

  it('FIND_CANDIDATE_ROUTES never implies that a recycler network exists', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'no-network' },
    });
    const drained = await drainSession(app, start.json().session.id);
    const find = drained.json().tasks.find(
      (task: { taskType: string }) => task.taskType === 'FIND_CANDIDATE_ROUTES',
    );
    expect(find.state).toBe('PARTIAL');
    expect(find.output.candidates).toEqual([]);
    expect(find.output.recyclerNetworkConnected).toBe(false);
    expect(find.output.reasonCode).toBe('RECYCLER_NETWORK_NOT_CONNECTED');
    expect(JSON.stringify(find.output)).not.toMatch(/connected":true/i);
  });

  it('keeps GET /health and GET /v1/info public without identity headers', async () => {
    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json().mode).toBe('DEVELOPMENT_ONLY');
    expect(health.json().check).toBe('process_liveness');

    const info = await app.inject({ method: 'GET', url: '/v1/info' });
    expect(info.statusCode).toBe(200);
    expect(info.json().integrations.materialOpportunityIntake).toBe(true);
    expect(info.json().integrations.nanoChat).toBe(false);
    expect(info.json().integrations.recyclerNetwork).toBe(false);
  });

  it('returns DEVELOPMENT_ONLY on every route, including identity failures', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: 'mode-flag' },
    });
    expect(start.json().mode).toBe('DEVELOPMENT_ONLY');
    const sessionId = start.json().session.id;

    const get = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}`,
      headers: devHeaders,
    });
    expect(get.json().mode).toBe('DEVELOPMENT_ONLY');

    const audit = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: devHeaders,
    });
    expect(audit.json().mode).toBe('DEVELOPMENT_ONLY');

    const run = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(run.json().mode).toBe('DEVELOPMENT_ONLY');

    const missing = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      payload: demoBody,
    });
    expect(missing.statusCode).toBe(401);
    expect(missing.json().mode).toBe('DEVELOPMENT_ONLY');
  });
});
