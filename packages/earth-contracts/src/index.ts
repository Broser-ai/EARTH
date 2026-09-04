/**
 * Shared EARTH contracts for SPA + API.
 *
 * Spelling and array order are frozen to docs/SHARED_CONTRACTS.md.
 * This module is types and literals only, plus the canonical DEMO GHG spine
 * (`demo-ghg.ts`). No LLM, NanoChat client, Roboflow, Tinker, blockchain,
 * or browser LangGraph runtime.
 */

export const DEVELOPMENT_MODE = 'DEVELOPMENT_ONLY' as const;
export type DevelopmentMode = typeof DEVELOPMENT_MODE;

export const WORKFLOW_TYPE = 'MATERIAL_OPPORTUNITY_INTAKE' as const;
export const WORKFLOW_VERSION = '0.1' as const;
export const POLICY_VERSION = 'prime-v0.1' as const;

export const HONESTY_LABELS = [
  'NOT_CONFIGURED',
  'NOT_CONNECTED',
  'DEMO',
  'ESTIMATED',
  'INPUT_UNVERIFIED',
] as const;
export type HonestyLabel = (typeof HONESTY_LABELS)[number];

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

export const TERMINAL_SESSION_STATES = [
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'BUDGET_STOPPED',
  'EXPIRED',
] as const;
export type TerminalSessionState = (typeof TERMINAL_SESSION_STATES)[number];

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

export const NEXT_ACTIONS = ['UPLOAD_EVIDENCE', 'RUN_NEXT', 'NONE'] as const;
export type NextRecommendedAction = (typeof NEXT_ACTIONS)[number];

/** Exact strings Michael required in the programming prompt. */
export const REQUIRED_PROMPT_STRINGS = [
  'DEVELOPMENT_ONLY',
  'INPUT_UNVERIFIED',
  'NOT_CONFIGURED',
  'NOT_CONNECTED',
  'EVIDENCE_MISSING',
  'RECYCLER_NETWORK_NOT_CONNECTED',
] as const;
export type RequiredPromptString = (typeof REQUIRED_PROMPT_STRINGS)[number];

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

export function assertNever(value: never): never {
  throw new Error(`Unhandled union member: ${JSON.stringify(value)}`);
}

export function isTerminalSessionState(state: SessionState): state is TerminalSessionState {
  return (TERMINAL_SESSION_STATES as readonly string[]).includes(state);
}

export {
  DEMO_GHG_CLASSIFICATION,
  DEMO_GHG_HONESTY,
  DEMO_GHG_LINE_ITEMS,
  DEMO_GHG_ORIGIN,
  DEMO_GHG_SCOPE_SHARE,
  DEMO_GHG_SCOPES,
  DEMO_GHG_SOURCE,
  DEMO_GHG_TOTAL,
  DEMO_GHG_UNSUITABLE_FOR,
  demoGhgMethodHonesty,
  demoGhgMethodLabel,
  demoGhgScopeLabel,
  demoGhgScopeShare,
  sumDemoGhgByScope,
  type DemoGhgLineItem,
  type DemoGhgMethod,
  type DemoGhgScope,
  type DemoGhgScopeShare,
  type DemoGhgScopeTotals,
  type DemoGhgUnsuitableUse,
} from './demo-ghg';
