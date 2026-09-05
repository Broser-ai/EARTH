import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { assertSessionTransition } from '../src/prime/state-machine.js';
import { PolicyError } from '../src/prime/types.js';
import {
  createPool,
  createTestApp,
  demoBody,
  DEV_ORG,
  DEV_USER,
  drainSession,
  devHeaders,
  otherHeaders,
  resetWorkflowTables,
} from './helpers.js';

const reviewerId = '66666666-6666-6666-6666-666666666666';
const reviewerHeaders = {
  'content-type': 'application/json',
  'x-earth-user-id': reviewerId,
};

function uniqueKey(label: string): string {
  return `prime-v0.2-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe('PRIME multi-session execution v0.2', () => {
  let pool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
    pool = await createPool();
    await pool.query(
      `INSERT INTO users (id, organization_id, email, role)
       VALUES ($1, $2, 'dev-reviewer@earth.local', 'REVIEWER')
       ON CONFLICT (id) DO NOTHING`,
      [reviewerId, DEV_ORG],
    );
    await pool.query(
      `INSERT INTO organization_memberships (id, organization_id, user_id, role, status)
       VALUES (gen_random_uuid(), $1, $2, 'REVIEWER', 'ACTIVE')
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'REVIEWER', status = 'ACTIVE'`,
      [DEV_ORG, reviewerId],
    );
    app = await createTestApp(pool);
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE approval_decisions, approval_requests, claim_evidence, evidence_records, evidence_documents, claims CASCADE`,
    );
    await resetWorkflowTables(pool);
  });

  it('rejects invalid session transitions', () => {
    expect(() => assertSessionTransition('COMPLETED', 'RUNNING')).toThrow(PolicyError);
    expect(() => assertSessionTransition('EXPIRED', 'RUNNING')).toThrow(PolicyError);
  });

  it('returns the same session for a repeated idempotency key', async () => {
    const key = uniqueKey('idem');
    const first = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: key },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: key },
    });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json().session.id).toBe(first.json().session.id);
  });

  it('does not let tenant B run or read tenant A session', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: uniqueKey('tenant') },
    });
    const sessionId = started.json().session.id as string;
    const read = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}`,
      headers: otherHeaders,
    });
    const run = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: otherHeaders,
    });
    const cancel = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/cancel`,
      headers: otherHeaders,
    });
    expect(read.statusCode).toBe(404);
    expect(run.statusCode).toBe(404);
    expect(cancel.statusCode).toBe(404);
  });

  it('fans out independent tasks and fans in before FIND_CANDIDATE_ROUTES', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: {
        ...demoBody,
        idempotencyKey: uniqueKey('fan'),
        evidence: { documentIds: ['doc-1'], extractionRequested: false },
      },
    });
    const sessionId = started.json().session.id as string;

    const validate = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(validate.statusCode).toBe(200);
    expect(validate.json().claimedTask.taskType).toBe('VALIDATE_BATCH');

    const wave = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(wave.statusCode).toBe(200);
    const claimedTypes = (wave.json().claimedTasks as Array<{ taskType: string }>).map(
      (task) => task.taskType,
    );
    expect(claimedTypes.sort()).toEqual(['CALCULATE_BASELINE', 'CHECK_EVIDENCE']);
    expect(wave.json().tasks.find((task: { taskType: string }) => task.taskType === 'FIND_CANDIDATE_ROUTES').state).toBe(
      'QUEUED',
    );

    const fanIn = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(fanIn.json().claimedTask.taskType).toBe('FIND_CANDIDATE_ROUTES');
    expect(fanIn.json().tasks.find((task: { taskType: string }) => task.taskType === 'CALCULATE_BASELINE').output.label).toBe(
      'INPUT_UNVERIFIED',
    );
  });

  it('requeues a failed task until max_attempts then persists TASK_RETRY_EXHAUSTED', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: uniqueKey('retry') },
    });
    const sessionId = started.json().session.id as string;
    await pool.query(
      `UPDATE execution_tasks
       SET input_json = '{"materialClass":"","quantityKg":1}'::jsonb
       WHERE session_id = $1 AND task_type = 'VALIDATE_BATCH'`,
      [sessionId],
    );

    const first = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().claimedTask.taskType).toBe('VALIDATE_BATCH');
    expect(first.json().claimedTask.state).toBe('QUEUED');

    const second = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().claimedTask.state).toBe('FAILED');
    expect(second.json().claimedTask.errorCode).toBe('TASK_RETRY_EXHAUSTED');
    expect(second.json().session.state).toBe('FAILED');

    const events = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: devHeaders,
    });
    const types = (events.json().events as Array<{ eventType: string }>).map((event) => event.eventType);
    expect(types).toContain('TASK_CLAIMED');
    expect(types).toContain('TASK_STATE_CHANGED');
    expect(types).toContain('SESSION_STATE_CHANGED');
  });

  it('resumes a stale RUNNING lease after simulated process crash', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: uniqueKey('resume') },
    });
    const sessionId = started.json().session.id as string;
    await pool.query(
      `UPDATE execution_tasks
       SET state = 'RUNNING', started_at = now() - interval '2 minutes',
           lease_expires_at = now() - interval '1 minute', attempt_count = 1
       WHERE session_id = $1 AND task_type = 'VALIDATE_BATCH'`,
      [sessionId],
    );

    const resumed = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(resumed.statusCode).toBe(200);
    expect(resumed.json().claimedTask.taskType).toBe('VALIDATE_BATCH');
    expect(['COMPLETED', 'QUEUED']).toContain(resumed.json().claimedTask.state);

    const events = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: devHeaders,
    });
    const types = (events.json().events as Array<{ eventType: string }>).map((event) => event.eventType);
    expect(types).toContain('TASK_TIMEOUT');
  });

  it('persists EXPIRED when the session timeout has passed', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: uniqueKey('expire') },
    });
    const sessionId = started.json().session.id as string;
    await pool.query(`UPDATE execution_sessions SET expires_at = now() - interval '1 second' WHERE id = $1`, [
      sessionId,
    ]);

    const expired = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(expired.statusCode).toBe(200);
    expect(expired.json().session.state).toBe('EXPIRED');
    expect(expired.json().claimedTask).toBeNull();

    const again = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('INVALID_STATE_TRANSITION');

    const read = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}`,
      headers: devHeaders,
    });
    expect(read.json().session.state).toBe('EXPIRED');
  });

  it('cancels a session and writes a durable audit event', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: uniqueKey('cancel') },
    });
    const sessionId = started.json().session.id as string;
    const cancelled = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/cancel`,
      headers: devHeaders,
    });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().session.state).toBe('CANCELLED');
    const events = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${sessionId}/audit-events`,
      headers: devHeaders,
    });
    expect((events.json().events as Array<{ eventType: string; nextState: string | null }>).some(
      (event) => event.eventType === 'SESSION_STATE_CHANGED' && event.nextState === 'CANCELLED',
    )).toBe(true);
  });

  it('holds HIGH_IMPACT sessions for human approval without self-approval', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: {
        ...demoBody,
        idempotencyKey: uniqueKey('approval'),
        evidence: { documentIds: ['doc-1'], extractionRequested: false },
      },
    });
    const sessionId = started.json().session.id as string;
    const request = await app.inject({
      method: 'POST',
      url: '/v1/approval-requests',
      headers: devHeaders,
      payload: {
        sessionId,
        requestType: 'HIGH_IMPACT_WORKFLOW',
        requiredRoles: ['OWNER', 'REVIEWER'],
        reason: 'Internal human review of intake snapshot; not a legal approval.',
      },
    });
    expect(request.statusCode).toBe(201);
    expect(request.json().request.state).toBe('PENDING');

    const drained = await drainSession(app, sessionId);
    expect(drained.statusCode).toBe(200);
    expect(drained.json().session.state).toBe('WAITING_FOR_APPROVAL');

    const self = await app.inject({
      method: 'POST',
      url: `/v1/approval-requests/${request.json().request.id}/decision`,
      headers: devHeaders,
      payload: { decision: 'APPROVED' },
    });
    expect(self.statusCode).toBe(403);
    expect(self.json().error.code).toBe('APPROVAL_SELF_REVIEW_FORBIDDEN');

    const decided = await app.inject({
      method: 'POST',
      url: `/v1/approval-requests/${request.json().request.id}/decision`,
      headers: reviewerHeaders,
      payload: { decision: 'APPROVED', comment: 'Internal review only.' },
    });
    expect(decided.statusCode).toBe(200);

    const resumed = await app.inject({
      method: 'POST',
      url: `/v1/sessions/${sessionId}/run-next`,
      headers: devHeaders,
    });
    expect(resumed.statusCode).toBe(200);
    expect(resumed.json().session.state).toBe('COMPLETED');
    expect(resumed.json().mode).toBe('DEVELOPMENT_ONLY');
  });

  it('rejects an approval decision when the session snapshot changed', async () => {
    const started = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: uniqueKey('stale') },
    });
    const sessionId = started.json().session.id as string;
    const request = await app.inject({
      method: 'POST',
      url: '/v1/approval-requests',
      headers: devHeaders,
      payload: {
        sessionId,
        requestType: 'HIGH_IMPACT_WORKFLOW',
        requiredRoles: ['REVIEWER'],
      },
    });
    await pool.query(`UPDATE material_batches SET quantity_kg = quantity_kg + 1 WHERE organization_id = $1`, [
      DEV_ORG,
    ]);
    const decided = await app.inject({
      method: 'POST',
      url: `/v1/approval-requests/${request.json().request.id}/decision`,
      headers: reviewerHeaders,
      payload: { decision: 'APPROVED' },
    });
    expect(decided.statusCode).toBe(409);
    expect(decided.json().error.code).toBe('APPROVAL_SNAPSHOT_STALE');
  });

  it('keeps an audit history across isolated sessions for the same tenant', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: uniqueKey('audit-a') },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/v1/material-opportunities/start',
      headers: devHeaders,
      payload: { ...demoBody, idempotencyKey: uniqueKey('audit-b') },
    });
    expect(first.json().session.id).not.toBe(second.json().session.id);
    await drainSession(app, first.json().session.id as string);
    const events = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${first.json().session.id}/audit-events`,
      headers: devHeaders,
    });
    const other = await app.inject({
      method: 'GET',
      url: `/v1/sessions/${first.json().session.id}/audit-events`,
      headers: otherHeaders,
    });
    expect(events.json().events.length).toBeGreaterThan(3);
    expect(events.json().events[0].eventType).toBe('SESSION_CREATED');
    expect(other.statusCode).toBe(404);
    void DEV_USER;
  });
});
