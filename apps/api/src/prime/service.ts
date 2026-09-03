import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { insertAuditEvent } from './audit.js';
import { planMaterialOpportunity } from './policy.js';
import {
  assertSessionTransition,
  assertTaskTransition,
  isRequiredSettled,
  isTerminalSession,
} from './state-machine.js';
import { runDeterministicTask } from './task-runner.js';
import {
  PolicyError,
  WORKFLOW_TYPE,
  WORKFLOW_VERSION,
  type Identity,
  type NextRecommendedAction,
  type ReasonCode,
  type SessionState,
  type SessionView,
  type StartOpportunityInput,
  type TaskState,
  type TaskType,
  type TaskView,
} from './types.js';

export interface SessionEnvelope {
  session: SessionView;
  tasks: TaskView[];
  nextRecommendedAction: NextRecommendedAction;
}

export interface RunNextResult extends SessionEnvelope {
  claimedTask: TaskView | null;
}

interface SessionRow {
  id: string;
  organization_id: string;
  material_batch_id: string;
  workflow_type: string;
  workflow_version: string;
  state: SessionState;
  state_version: number;
  idempotency_key: string;
  data_classification: string;
  max_tasks: string | number;
  max_parallel_tasks: string | number;
  max_llm_calls: string | number;
  used_llm_calls: string | number;
  max_input_tokens: string | number;
  used_input_tokens: string | number;
  max_output_tokens: string | number;
  used_output_tokens: string | number;
  max_estimated_cost_dkk: string;
  used_estimated_cost_dkk: string;
  max_estimated_gco2e: string;
  used_estimated_gco2e: string;
  created_by: string;
}

interface TaskRow {
  id: string;
  session_id: string;
  organization_id: string;
  task_type: TaskType;
  state: TaskState;
  required: boolean;
  priority: number;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown> | null;
  error_code: string | null;
  attempt_count: number;
  max_attempts: number;
}

function num(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export class PrimeService {
  constructor(private readonly pool: Pool) {}

  async startOpportunity(identity: Identity, input: StartOpportunityInput): Promise<SessionEnvelope> {
    const plan = planMaterialOpportunity(input);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<SessionRow>(
        `SELECT * FROM execution_sessions
         WHERE organization_id = $1 AND idempotency_key = $2
         FOR UPDATE`,
        [identity.organizationId, input.idempotencyKey],
      );
      if (existing.rows[0]) {
        const envelope = await this.loadEnvelope(client, identity.organizationId, existing.rows[0].id);
        if (!envelope) {
          throw new Error('idempotent session missing after lock');
        }
        await client.query('COMMIT');
        return envelope;
      }

      const batchId = randomUUID();
      const sessionId = randomUUID();

      await client.query(
        `INSERT INTO material_batches (
          id, organization_id, external_reference, material_class, quantity_kg,
          facility_name, available_from, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8)`,
        [
          batchId,
          identity.organizationId,
          input.materialBatch.externalReference ?? null,
          input.materialBatch.materialClass.trim(),
          input.materialBatch.quantityKg,
          input.materialBatch.facilityName ?? null,
          input.materialBatch.availableFrom ?? null,
          identity.userId,
        ],
      );

      await client.query(
        `INSERT INTO execution_sessions (
          id, organization_id, material_batch_id, workflow_type, workflow_version,
          state, idempotency_key, data_classification,
          max_tasks, max_parallel_tasks, max_llm_calls, max_input_tokens,
          max_output_tokens, max_estimated_cost_dkk, max_estimated_gco2e,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          'QUEUED', $6, $7,
          $8, $9, $10, $11,
          $12, $13, $14,
          $15
        )`,
        [
          sessionId,
          identity.organizationId,
          batchId,
          WORKFLOW_TYPE,
          WORKFLOW_VERSION,
          input.idempotencyKey,
          input.dataClassification,
          plan.budget.maxTasks,
          plan.budget.maxParallelTasks,
          plan.budget.maxLlmCalls,
          plan.budget.maxInputTokens,
          plan.budget.maxOutputTokens,
          plan.budget.maxEstimatedCostDkk,
          plan.budget.maxEstimatedGco2e,
          identity.userId,
        ],
      );

      await insertAuditEvent(client, {
        organizationId: identity.organizationId,
        sessionId,
        actorType: 'USER',
        actorId: identity.userId,
        eventType: 'SESSION_CREATED',
        previousState: null,
        nextState: 'QUEUED',
        input,
        metadata: {
          workflowType: WORKFLOW_TYPE,
          workflowVersion: WORKFLOW_VERSION,
          reasonCodes: plan.reasonCodes,
          extractionRequested: input.evidence.extractionRequested,
          documentIds: input.evidence.documentIds,
        },
      });

      for (const planned of plan.tasks) {
        const taskId = randomUUID();
        await client.query(
          `INSERT INTO execution_tasks (
            id, session_id, organization_id, task_type, state, required, priority,
            input_json, idempotency_key
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
          [
            taskId,
            sessionId,
            identity.organizationId,
            planned.taskType,
            planned.initialState,
            planned.required,
            planned.priority,
            JSON.stringify(planned.input),
            planned.taskType,
          ],
        );
        await insertAuditEvent(client, {
          organizationId: identity.organizationId,
          sessionId,
          taskId,
          actorType: 'SYSTEM',
          actorId: 'prime-v0.1',
          eventType: 'TASK_CREATED',
          previousState: null,
          nextState: planned.initialState,
          input: planned.input,
          metadata: {
            taskType: planned.taskType,
            required: planned.required,
            priority: planned.priority,
          },
        });
      }

      await this.transitionSession(client, {
        organizationId: identity.organizationId,
        sessionId,
        from: 'QUEUED',
        to: 'RUNNING',
        actorType: 'SYSTEM',
        actorId: 'prime-v0.1',
      });

      const envelope = await this.loadEnvelope(client, identity.organizationId, sessionId);
      if (!envelope) {
        throw new Error('session missing after insert');
      }
      await client.query('COMMIT');
      return envelope;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSession(organizationId: string, sessionId: string): Promise<SessionEnvelope | null> {
    const client = await this.pool.connect();
    try {
      return await this.loadEnvelope(client, organizationId, sessionId);
    } finally {
      client.release();
    }
  }

  async listAuditEvents(organizationId: string, sessionId: string): Promise<
    Array<{
      id: string;
      organizationId: string;
      sessionId: string | null;
      taskId: string | null;
      actorType: string;
      actorId: string;
      eventType: string;
      previousState: string | null;
      nextState: string | null;
      policyVersion: string;
      inputDigest: string | null;
      outputDigest: string | null;
      metadata: Record<string, unknown>;
      createdAt: string;
    }> | null
  > {
    const session = await this.pool.query(
      `SELECT id FROM execution_sessions WHERE id = $1 AND organization_id = $2`,
      [sessionId, organizationId],
    );
    if (!session.rows[0]) {
      return null;
    }

    const result = await this.pool.query<{
      id: string;
      organization_id: string;
      session_id: string | null;
      task_id: string | null;
      actor_type: string;
      actor_id: string;
      event_type: string;
      previous_state: string | null;
      next_state: string | null;
      policy_version: string;
      input_digest: string | null;
      output_digest: string | null;
      metadata_json: Record<string, unknown>;
      created_at: Date;
    }>(
      `SELECT * FROM audit_events
       WHERE organization_id = $1 AND session_id = $2
       ORDER BY created_at ASC, id ASC`,
      [organizationId, sessionId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      sessionId: row.session_id,
      taskId: row.task_id,
      actorType: row.actor_type,
      actorId: row.actor_id,
      eventType: row.event_type,
      previousState: row.previous_state,
      nextState: row.next_state,
      policyVersion: row.policy_version,
      inputDigest: row.input_digest,
      outputDigest: row.output_digest,
      metadata: asRecord(row.metadata_json),
      createdAt: row.created_at.toISOString(),
    }));
  }

  async runNext(identity: Identity, sessionId: string): Promise<RunNextResult | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const sessionResult = await client.query<SessionRow>(
        `SELECT * FROM execution_sessions
         WHERE id = $1 AND organization_id = $2
         FOR UPDATE`,
        [sessionId, identity.organizationId],
      );
      const session = sessionResult.rows[0];
      if (!session) {
        await client.query('ROLLBACK');
        return null;
      }

      if (isTerminalSession(session.state)) {
        throw new PolicyError(
          'INVALID_STATE_TRANSITION',
          `cannot run-next while session is ${session.state}`,
        );
      }

      const queued = await client.query<TaskRow>(
        `SELECT * FROM execution_tasks
         WHERE session_id = $1 AND organization_id = $2 AND state = 'QUEUED'
         ORDER BY priority ASC, created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        [sessionId, identity.organizationId],
      );
      const task = queued.rows[0];
      if (!task) {
        await this.recomputeSessionState(client, session);
        const envelope = await this.requireEnvelope(client, identity.organizationId, sessionId);
        await client.query('COMMIT');
        return { ...envelope, claimedTask: null };
      }

      assertTaskTransition(task.state, 'RUNNING');
      const attempts = task.attempt_count + 1;
      await client.query(
        `UPDATE execution_tasks
         SET state = 'RUNNING', started_at = now(), attempt_count = $2
         WHERE id = $1`,
        [task.id, attempts],
      );
      await insertAuditEvent(client, {
        organizationId: identity.organizationId,
        sessionId,
        taskId: task.id,
        actorType: 'WORKER',
        actorId: 'earth-dev-worker',
        eventType: 'TASK_CLAIMED',
        previousState: 'QUEUED',
        nextState: 'RUNNING',
        input: task.input_json,
        metadata: { attemptCount: attempts },
      });

      const result = runDeterministicTask({
        id: task.id,
        taskType: task.task_type,
        state: 'RUNNING',
        input: asRecord(task.input_json),
      });

      const budgetError = this.checkBudget(session, result);
      if (budgetError) {
        await client.query(
          `UPDATE execution_tasks
           SET state = 'BLOCKED', error_code = $2, output_json = $3::jsonb, completed_at = now()
           WHERE id = $1`,
          [task.id, 'BUDGET_EXCEEDED', JSON.stringify({ reasonCode: 'BUDGET_EXCEEDED' })],
        );
        await insertAuditEvent(client, {
          organizationId: identity.organizationId,
          sessionId,
          taskId: task.id,
          actorType: 'WORKER',
          actorId: 'earth-dev-worker',
          eventType: 'TASK_STATE_CHANGED',
          previousState: 'RUNNING',
          nextState: 'BLOCKED',
          output: { reasonCode: 'BUDGET_EXCEEDED' },
          metadata: { reasonCode: 'BUDGET_EXCEEDED' },
        });
        await this.transitionSession(client, {
          organizationId: identity.organizationId,
          sessionId,
          from: session.state,
          to: 'BUDGET_STOPPED',
          actorType: 'SYSTEM',
          actorId: 'prime-v0.1',
          metadata: { reasonCode: 'BUDGET_EXCEEDED' },
        });
        const envelope = await this.requireEnvelope(client, identity.organizationId, sessionId);
        await client.query('COMMIT');
        return { ...envelope, claimedTask: envelope.tasks.find((item) => item.id === task.id) ?? null };
      }

      let nextState = result.state;
      if (result.state === 'FAILED' && attempts >= task.max_attempts) {
        result.errorCode = 'TASK_RETRY_EXHAUSTED';
        result.reasonCodes = [...result.reasonCodes, 'TASK_RETRY_EXHAUSTED'];
      } else if (result.state === 'FAILED' && attempts < task.max_attempts) {
        nextState = 'QUEUED';
      }

      assertTaskTransition('RUNNING', nextState);
      await client.query(
        `UPDATE execution_tasks
         SET state = $2,
             output_json = $3::jsonb,
             error_code = $4,
             completed_at = CASE WHEN $2 IN ('QUEUED') THEN NULL ELSE now() END
         WHERE id = $1`,
        [task.id, nextState, JSON.stringify(result.output), result.errorCode],
      );
      await client.query(
        `UPDATE execution_sessions
         SET used_estimated_cost_dkk = used_estimated_cost_dkk + $2,
             used_estimated_gco2e = used_estimated_gco2e + $3,
             used_llm_calls = used_llm_calls + $4,
             used_input_tokens = used_input_tokens + $5,
             used_output_tokens = used_output_tokens + $6,
             updated_at = now()
         WHERE id = $1`,
        [
          sessionId,
          result.estimatedCostDkk,
          result.estimatedGco2e,
          result.llmCalls,
          result.inputTokens,
          result.outputTokens,
        ],
      );
      await insertAuditEvent(client, {
        organizationId: identity.organizationId,
        sessionId,
        taskId: task.id,
        actorType: 'WORKER',
        actorId: 'earth-dev-worker',
        eventType: 'TASK_STATE_CHANGED',
        previousState: 'RUNNING',
        nextState,
        output: result.output,
        metadata: {
          taskType: task.task_type,
          reasonCodes: result.reasonCodes,
          errorCode: result.errorCode,
        },
      });

      const refreshed = await client.query<SessionRow>(
        `SELECT * FROM execution_sessions WHERE id = $1 FOR UPDATE`,
        [sessionId],
      );
      const nextSession = refreshed.rows[0];
      if (!nextSession) {
        throw new Error('session missing after task update');
      }
      await this.recomputeSessionState(client, nextSession);

      const envelope = await this.requireEnvelope(client, identity.organizationId, sessionId);
      await client.query('COMMIT');
      return { ...envelope, claimedTask: envelope.tasks.find((item) => item.id === task.id) ?? null };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private checkBudget(
    session: SessionRow,
    result: ReturnType<typeof runDeterministicTask>,
  ): PolicyError | null {
    if (
      num(session.used_estimated_cost_dkk) + result.estimatedCostDkk > num(session.max_estimated_cost_dkk) ||
      num(session.used_estimated_gco2e) + result.estimatedGco2e > num(session.max_estimated_gco2e) ||
      num(session.used_llm_calls) + result.llmCalls > num(session.max_llm_calls) ||
      num(session.used_input_tokens) + result.inputTokens > num(session.max_input_tokens) ||
      num(session.used_output_tokens) + result.outputTokens > num(session.max_output_tokens)
    ) {
      return new PolicyError('BUDGET_EXCEEDED', 'task would exceed session budget');
    }
    return null;
  }

  private async recomputeSessionState(
    client: PoolClient,
    session: SessionRow,
  ): Promise<void> {
    const tasks = await this.loadTasks(client, session.id);
    const required = tasks.filter((task) => task.required);
    const failed = required.filter((task) => task.state === 'FAILED' || task.state === 'CANCELLED');
    if (failed.length > 0) {
      await this.transitionSession(client, {
        organizationId: session.organization_id,
        sessionId: session.id,
        from: session.state,
        to: 'FAILED',
        actorType: 'SYSTEM',
        actorId: 'prime-v0.1',
        metadata: { failedTaskIds: failed.map((task) => task.id) },
      });
      return;
    }

    const pending = required.filter(
      (task) => task.state === 'QUEUED' || task.state === 'RUNNING' || task.state === 'BLOCKED',
    );
    if (pending.length > 0) {
      if (session.state !== 'RUNNING' && session.state !== 'WAITING_FOR_DEPENDENCY') {
        await this.transitionSession(client, {
          organizationId: session.organization_id,
          sessionId: session.id,
          from: session.state,
          to: 'RUNNING',
          actorType: 'SYSTEM',
          actorId: 'prime-v0.1',
        });
      }
      return;
    }

    const allSettled = required.every((task) => isRequiredSettled(task.state));
    if (!allSettled) {
      return;
    }

    const evidenceMissing = tasks.some((task) => {
      if (task.task_type !== 'CHECK_EVIDENCE') {
        return false;
      }
      return task.error_code === 'EVIDENCE_MISSING' || asRecord(task.output_json).reasonCode === 'EVIDENCE_MISSING';
    });

    const next: SessionState = evidenceMissing ? 'WAITING_FOR_DEPENDENCY' : 'COMPLETED';
    await this.transitionSession(client, {
      organizationId: session.organization_id,
      sessionId: session.id,
      from: session.state,
      to: next,
      actorType: 'SYSTEM',
      actorId: 'prime-v0.1',
      metadata: { evidenceMissing },
    });
  }

  private async transitionSession(
    client: PoolClient,
    args: {
      organizationId: string;
      sessionId: string;
      from: SessionState;
      to: SessionState;
      actorType: 'USER' | 'SYSTEM' | 'WORKER';
      actorId: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (args.from === args.to) {
      return;
    }
    assertSessionTransition(args.from, args.to);
    await client.query(
      `UPDATE execution_sessions
       SET state = $2, state_version = state_version + 1, updated_at = now()
       WHERE id = $1`,
      [args.sessionId, args.to],
    );
    await insertAuditEvent(client, {
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      actorType: args.actorType,
      actorId: args.actorId,
      eventType: 'SESSION_STATE_CHANGED',
      previousState: args.from,
      nextState: args.to,
      metadata: args.metadata ?? {},
    });
  }

  private async loadTasks(client: PoolClient, sessionId: string): Promise<TaskRow[]> {
    const result = await client.query<TaskRow>(
      `SELECT * FROM execution_tasks WHERE session_id = $1 ORDER BY priority ASC, created_at ASC`,
      [sessionId],
    );
    return result.rows;
  }

  private async requireEnvelope(
    client: PoolClient,
    organizationId: string,
    sessionId: string,
  ): Promise<SessionEnvelope> {
    const envelope = await this.loadEnvelope(client, organizationId, sessionId);
    if (!envelope) {
      throw new Error('session missing after write');
    }
    return envelope;
  }

  private async loadEnvelope(
    client: PoolClient,
    organizationId: string,
    sessionId: string,
  ): Promise<SessionEnvelope | null> {
    const sessionResult = await client.query<SessionRow>(
      `SELECT * FROM execution_sessions WHERE id = $1 AND organization_id = $2`,
      [sessionId, organizationId],
    );
    const session = sessionResult.rows[0];
    if (!session) {
      return null;
    }
    const tasks = await this.loadTasks(client, sessionId);
    const created = await client.query<{ metadata_json: Record<string, unknown> }>(
      `SELECT metadata_json FROM audit_events
       WHERE session_id = $1 AND event_type = 'SESSION_CREATED'
       ORDER BY created_at ASC
       LIMIT 1`,
      [sessionId],
    );
    const startMeta = asRecord(created.rows[0]?.metadata_json);
    const reasonCodes = collectReasonCodes(startMeta, tasks);
    return {
      session: toSessionView(session, reasonCodes),
      tasks: tasks.map(toTaskView),
      nextRecommendedAction: nextAction(session.state, reasonCodes, tasks),
    };
  }
}

function collectReasonCodes(
  startMeta: Record<string, unknown>,
  tasks: TaskRow[],
): ReasonCode[] {
  const codes = new Set<ReasonCode>();
  const fromStart = startMeta.reasonCodes;
  if (Array.isArray(fromStart)) {
    for (const code of fromStart) {
      if (typeof code === 'string') {
        codes.add(code as ReasonCode);
      }
    }
  }
  for (const task of tasks) {
    const output = asRecord(task.output_json);
    const outputCode = output.reasonCode;
    if (typeof outputCode === 'string') {
      codes.add(outputCode as ReasonCode);
    }
    if (task.error_code) {
      codes.add(task.error_code as ReasonCode);
    }
    if (task.task_type === 'NANOCHAT_EXTRACT' && task.state === 'NOT_CONFIGURED') {
      codes.add('NANOCHAT_NOT_CONFIGURED');
    }
  }
  return [...codes];
}

function toSessionView(session: SessionRow, reasonCodes: ReasonCode[]): SessionView {
  return {
    id: session.id,
    state: session.state,
    workflowType: session.workflow_type,
    workflowVersion: session.workflow_version,
    budget: {
      maxTasks: num(session.max_tasks),
      maxParallelTasks: num(session.max_parallel_tasks),
      maxLlmCalls: num(session.max_llm_calls),
      usedLlmCalls: num(session.used_llm_calls),
      maxInputTokens: num(session.max_input_tokens),
      usedInputTokens: num(session.used_input_tokens),
      maxOutputTokens: num(session.max_output_tokens),
      usedOutputTokens: num(session.used_output_tokens),
      maxEstimatedCostDkk: num(session.max_estimated_cost_dkk),
      usedEstimatedCostDkk: num(session.used_estimated_cost_dkk),
      maxEstimatedGco2e: num(session.max_estimated_gco2e),
      usedEstimatedGco2e: num(session.used_estimated_gco2e),
    },
    reasonCodes,
  };
}

function toTaskView(task: TaskRow): TaskView {
  return {
    id: task.id,
    taskType: task.task_type,
    state: task.state,
    required: task.required,
    priority: task.priority,
    output: task.output_json,
    errorCode: task.error_code,
  };
}

function nextAction(
  state: SessionState,
  reasonCodes: ReasonCode[],
  tasks: TaskRow[],
): NextRecommendedAction {
  if (reasonCodes.includes('EVIDENCE_MISSING') || state === 'WAITING_FOR_DEPENDENCY') {
    return 'UPLOAD_EVIDENCE';
  }
  const hasQueued = tasks.some((task) => task.state === 'QUEUED');
  if (hasQueued && !isTerminalSession(state)) {
    return 'RUN_NEXT';
  }
  return 'NONE';
}
