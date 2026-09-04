export const DEV_ORG_ID = '11111111-1111-1111-1111-111111111111';
export const DEV_USER_ID = '22222222-2222-2222-2222-222222222222';
export const DEV_USER_ROLE = 'OWNER' as const;

export const DEVELOPMENT_HEADERS = {
  'content-type': 'application/json',
  'x-earth-org-id': DEV_ORG_ID,
  'x-earth-user-id': DEV_USER_ID,
  'x-earth-user-role': DEV_USER_ROLE,
} as const;

export interface SessionView {
  id: string;
  state: string;
  workflowType: string;
  workflowVersion: string;
  reasonCodes: string[];
}

export interface TaskView {
  id: string;
  taskType: string;
  state: string;
  required: boolean;
  priority: number;
  output: Record<string, unknown> | null;
  errorCode: string | null;
}

export interface SessionEnvelope {
  mode: string;
  session: SessionView;
  tasks: TaskView[];
  nextRecommendedAction: string;
  claimedTask?: TaskView | null;
}

export interface IntakeErrorBody {
  mode?: string;
  error?: { code?: string; message?: string };
}

export interface StartOpportunityBody {
  idempotencyKey: string;
  materialBatch: {
    externalReference: string;
    materialClass: string;
    quantityKg: number;
    facilityName: string;
    availableFrom: string;
  };
  baseline: {
    disposalCostDkk: number;
    co2eKg: number;
  };
  evidence: {
    documentIds: string[];
    extractionRequested: boolean;
  };
  dataClassification: 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
}

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
  const record = body && typeof body === 'object' ? (body as IntakeErrorBody) : {};
  const code = record.error?.code ?? 'HTTP_ERROR';
  const message = record.error?.message ?? `request failed with status ${status}`;
  return new IntakeApiError(status, code, message, record.mode);
}

export async function startMaterialOpportunity(
  body: StartOpportunityBody,
): Promise<SessionEnvelope> {
  const response = await fetch('/v1/material-opportunities/start', {
    method: 'POST',
    headers: DEVELOPMENT_HEADERS,
    body: JSON.stringify(body),
  });
  const payload = await parseJson(response);
  if (response.status !== 201) {
    throw asError(response.status, payload);
  }
  return payload as SessionEnvelope;
}

export async function getSession(sessionId: string): Promise<SessionEnvelope> {
  const response = await fetch(`/v1/sessions/${sessionId}`, {
    method: 'GET',
    headers: DEVELOPMENT_HEADERS,
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throw asError(response.status, payload);
  }
  return payload as SessionEnvelope;
}

export async function runNext(sessionId: string): Promise<SessionEnvelope> {
  const response = await fetch(`/v1/sessions/${sessionId}/run-next`, {
    method: 'POST',
    headers: DEVELOPMENT_HEADERS,
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    throw asError(response.status, payload);
  }
  return payload as SessionEnvelope;
}
