import { z } from 'zod';

export const DEVELOPMENT_ONLY = 'DEVELOPMENT_ONLY' as const;

export const DEV_ORG_ID = '11111111-1111-1111-1111-111111111111';
export const DEV_USER_ID = '22222222-2222-2222-2222-222222222222';
export const DEV_USER_ROLE = 'OWNER' as const;

/** DEVELOPMENT ONLY identity headers — same names as the Fastify curl. Not authentication. */
export const DEVELOPMENT_HEADERS = {
  'Content-Type': 'application/json',
  'x-earth-org-id': DEV_ORG_ID,
  'x-earth-user-id': DEV_USER_ID,
  'x-earth-user-role': DEV_USER_ROLE,
} as const;

/**
 * Character-for-character field names from apps/api POST /v1/material-opportunities/start.
 * Mirrors the Fastify Zod body (routes.ts) — do not rename keys.
 */
export const startBodySchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  materialBatch: z.object({
    externalReference: z.string().max(200).nullable().optional(),
    materialClass: z.string().optional(),
    quantityKg: z.number().optional(),
    facilityName: z.string().max(200).nullable().optional(),
    availableFrom: z.string().datetime().nullable().optional(),
  }),
  baseline: z.object({
    disposalCostDkk: z.number(),
    co2eKg: z.number(),
  }),
  evidence: z.object({
    documentIds: z.array(z.string()),
    extractionRequested: z.boolean(),
  }),
  dataClassification: z.enum(['INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']),
});

export type StartOpportunityBody = z.infer<typeof startBodySchema>;

const sessionBudgetSchema = z.object({
  maxTasks: z.number(),
  maxParallelTasks: z.number(),
  maxLlmCalls: z.number(),
  usedLlmCalls: z.number(),
  maxInputTokens: z.number(),
  usedInputTokens: z.number(),
  maxOutputTokens: z.number(),
  usedOutputTokens: z.number(),
  maxEstimatedCostDkk: z.number(),
  usedEstimatedCostDkk: z.number(),
  maxEstimatedGco2e: z.number(),
  usedEstimatedGco2e: z.number(),
});

const sessionViewSchema = z.object({
  id: z.string(),
  state: z.string(),
  workflowType: z.string(),
  workflowVersion: z.string(),
  budget: sessionBudgetSchema.optional(),
  reasonCodes: z.array(z.string()),
});

const taskViewSchema = z.object({
  id: z.string(),
  taskType: z.string(),
  state: z.string(),
  required: z.boolean(),
  priority: z.number(),
  output: z.record(z.unknown()).nullable(),
  errorCode: z.string().nullable(),
});

export const sessionEnvelopeSchema = z.object({
  mode: z.literal(DEVELOPMENT_ONLY),
  session: sessionViewSchema,
  tasks: z.array(taskViewSchema),
  nextRecommendedAction: z.string(),
  claimedTask: taskViewSchema.nullable().optional(),
});

export type SessionView = z.infer<typeof sessionViewSchema>;
export type TaskView = z.infer<typeof taskViewSchema>;
export type SessionEnvelope = z.infer<typeof sessionEnvelopeSchema>;

export const errorBodySchema = z.object({
  mode: z.literal(DEVELOPMENT_ONLY).optional(),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

export type IntakeErrorBody = z.infer<typeof errorBodySchema>;

/** Same JSON object as the README / curl demo body. */
export const DEFAULT_START_BODY: StartOpportunityBody = {
  idempotencyKey: 'demo-hdpe-2026-001',
  materialBatch: {
    externalReference: 'BATCH-2026-001',
    materialClass: 'HDPE_OFFCUTS',
    quantityKg: 15200,
    facilityName: 'Demo Factory Aarhus',
    availableFrom: '2026-09-03T12:00:00.000Z',
  },
  baseline: {
    disposalCostDkk: 38400,
    co2eKg: 4800,
  },
  evidence: {
    documentIds: [],
    extractionRequested: false,
  },
  dataClassification: 'CONFIDENTIAL',
};

export class IntakeApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly mode: string | undefined;

  constructor(status: number, code: string, message: string, mode?: string) {
    super(message);
    this.name = 'IntakeApiError';
    this.status = status;
    this.code = code;
    this.mode = mode;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: { code: 'INVALID_JSON', message: text } };
  }
}

function asError(status: number, body: unknown): IntakeApiError {
  const parsed = errorBodySchema.safeParse(body);
  const record = parsed.success ? parsed.data : {};
  const code = record.error?.code ?? 'HTTP_ERROR';
  const message = record.error?.message ?? `request failed with status ${status}`;
  return new IntakeApiError(status, code, message, record.mode);
}

export async function startMaterialOpportunity(
  body: StartOpportunityBody,
): Promise<SessionEnvelope> {
  const payload = startBodySchema.parse(body);
  const response = await fetch('/v1/material-opportunities/start', {
    method: 'POST',
    headers: DEVELOPMENT_HEADERS,
    body: JSON.stringify(payload),
  });
  const json = await parseJson(response);
  if (response.status !== 201) {
    throw asError(response.status, json);
  }
  return sessionEnvelopeSchema.parse(json);
}

export async function getSession(sessionId: string): Promise<SessionEnvelope> {
  const response = await fetch(`/v1/sessions/${sessionId}`, {
    method: 'GET',
    headers: DEVELOPMENT_HEADERS,
  });
  const json = await parseJson(response);
  if (!response.ok) {
    throw asError(response.status, json);
  }
  return sessionEnvelopeSchema.parse(json);
}

export async function runNext(sessionId: string): Promise<SessionEnvelope> {
  const response = await fetch(`/v1/sessions/${sessionId}/run-next`, {
    method: 'POST',
    headers: DEVELOPMENT_HEADERS,
  });
  const json = await parseJson(response);
  if (!response.ok) {
    throw asError(response.status, json);
  }
  return sessionEnvelopeSchema.parse(json);
}
