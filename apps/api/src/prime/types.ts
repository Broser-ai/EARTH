import type {
  ActorType,
  PolicyBudget,
  ReasonCode,
  SessionState,
  TaskState,
  TaskType,
  UserRole,
} from '../contracts.js';

export {
  ACTOR_TYPES,
  DATA_CLASSIFICATIONS,
  NEXT_ACTIONS,
  POLICY_VERSION,
  REASON_CODES,
  SESSION_STATES,
  TASK_STATES,
  TASK_TYPES,
  USER_ROLES,
  WORKFLOW_TYPE,
  WORKFLOW_VERSION,
  assertNever,
  type ActorType,
  type BaselineInput,
  type DataClassification,
  type EvidenceInput,
  type MaterialBatchInput,
  type NextRecommendedAction,
  type PolicyBudget,
  type ReasonCode,
  type SessionState,
  type StartOpportunityInput,
  type TaskState,
  type TaskType,
  type UserRole,
} from '../contracts.js';

export interface PlannedTask {
  taskType: TaskType;
  required: boolean;
  priority: number;
  initialState: TaskState;
  dependsOnTaskTypes: readonly TaskType[];
  input: Record<string, unknown>;
}

export interface PolicyPlan {
  budget: PolicyBudget;
  tasks: PlannedTask[];
  reasonCodes: ReasonCode[];
}

export type { AuthenticatedActor, TenantContext } from '../auth/types.js';

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
  authMode: string | null;
  correlationId: string | null;
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
