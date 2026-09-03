export const POLICY_VERSION = 'prime-v0.1';
export const WORKFLOW_TYPE = 'MATERIAL_OPPORTUNITY_INTAKE';
export const WORKFLOW_VERSION = '0.1';

export const USER_ROLES = [
  'OWNER',
  'ESG_LEAD',
  'OPERATIONS',
  'REVIEWER',
  'VIEWER',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SESSION_STATES = [
  'QUEUED',
  'RUNNING',
  'WAITING_FOR_DEPENDENCY',
  'WAITING_FOR_APPROVAL',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'BUDGET_STOPPED',
  'EXPIRED',
] as const;
export type SessionState = (typeof SESSION_STATES)[number];

export const TASK_TYPES = [
  'VALIDATE_BATCH',
  'CHECK_EVIDENCE',
  'CALCULATE_BASELINE',
  'FIND_CANDIDATE_ROUTES',
  'NANOCHAT_EXTRACT',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATES = [
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'PARTIAL',
  'ABSTAINED',
  'FAILED',
  'BLOCKED',
  'NOT_CONFIGURED',
  'CANCELLED',
] as const;
export type TaskState = (typeof TASK_STATES)[number];

export const DATA_CLASSIFICATIONS = ['INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const;
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

export const ACTOR_TYPES = ['USER', 'SYSTEM', 'WORKER'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const REASON_CODES = [
  'INVALID_QUANTITY',
  'MATERIAL_CLASS_REQUIRED',
  'EVIDENCE_MISSING',
  'NANOCHAT_RESTRICTED_DATA_BLOCK',
  'NANOCHAT_NOT_CONFIGURED',
  'BUDGET_EXCEEDED',
  'INVALID_STATE_TRANSITION',
  'TASK_RETRY_EXHAUSTED',
  'RECYCLER_NETWORK_NOT_CONNECTED',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export const NEXT_ACTIONS = [
  'UPLOAD_EVIDENCE',
  'RUN_NEXT',
  'NONE',
] as const;
export type NextRecommendedAction = (typeof NEXT_ACTIONS)[number];

export interface PolicyBudget {
  maxTasks: number;
  maxParallelTasks: number;
  maxLlmCalls: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostDkk: number;
  maxEstimatedGco2e: number;
}

export interface MaterialBatchInput {
  externalReference?: string | null;
  materialClass: string;
  quantityKg: number;
  facilityName?: string | null;
  availableFrom?: string | null;
}

export interface BaselineInput {
  disposalCostDkk: number;
  co2eKg: number;
}

export interface EvidenceInput {
  documentIds: string[];
  extractionRequested: boolean;
}

export interface StartOpportunityInput {
  idempotencyKey: string;
  materialBatch: MaterialBatchInput;
  baseline: BaselineInput;
  evidence: EvidenceInput;
  dataClassification: DataClassification;
}

export interface PlannedTask {
  taskType: TaskType;
  required: boolean;
  priority: number;
  initialState: TaskState;
  input: Record<string, unknown>;
}

export interface PolicyPlan {
  budget: PolicyBudget;
  tasks: PlannedTask[];
  reasonCodes: ReasonCode[];
}

export interface Identity {
  organizationId: string;
  userId: string;
  role: UserRole;
}

export interface SessionBudgetView {
  maxTasks: number;
  maxParallelTasks: number;
  maxLlmCalls: number;
  usedLlmCalls: number;
  maxInputTokens: number;
  usedInputTokens: number;
  maxOutputTokens: number;
  usedOutputTokens: number;
  maxEstimatedCostDkk: number;
  usedEstimatedCostDkk: number;
  maxEstimatedGco2e: number;
  usedEstimatedGco2e: number;
}

export interface SessionView {
  id: string;
  state: SessionState;
  workflowType: string;
  workflowVersion: string;
  budget: SessionBudgetView;
  reasonCodes: ReasonCode[];
}

export interface TaskView {
  id: string;
  taskType: TaskType;
  state: TaskState;
  required: boolean;
  priority: number;
  output: Record<string, unknown> | null;
  errorCode: string | null;
}

export interface AuditEventView {
  id: string;
  organizationId: string;
  sessionId: string | null;
  taskId: string | null;
  actorType: ActorType;
  actorId: string;
  eventType: string;
  previousState: string | null;
  nextState: string | null;
  policyVersion: string;
  inputDigest: string | null;
  outputDigest: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export class PolicyError extends Error {
  readonly code: ReasonCode | string;

  constructor(code: ReasonCode | string, message: string) {
    super(message);
    this.name = 'PolicyError';
    this.code = code;
  }
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled union member: ${JSON.stringify(value)}`);
}
