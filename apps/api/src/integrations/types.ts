import type { TenantContext } from '../auth/types.js';
import { assertNever } from '../contracts.js';

export const INTEGRATION_PROVIDER_KEYS = [
  'ROBOFLOW',
  'HUGGINGFACE',
  'TINKER',
  'INKLING',
  'HEYGEN',
  'LANGGRAPH',
] as const;

export type IntegrationProviderKey = (typeof INTEGRATION_PROVIDER_KEYS)[number];

export const INTEGRATION_PROVIDER_STATUSES = [
  'NOT_CONFIGURED',
  'DISABLED',
  'AVAILABLE',
  'DEGRADED',
  'ERROR',
] as const;

export type IntegrationProviderStatus = (typeof INTEGRATION_PROVIDER_STATUSES)[number];

export const INTEGRATION_OPERATION_STATES = [
  'REQUESTED',
  'BLOCKED',
  'NOT_CONFIGURED',
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
] as const;

export type IntegrationOperationState = (typeof INTEGRATION_OPERATION_STATES)[number];

export const INTEGRATION_DATA_CLASSIFICATIONS = [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'RESTRICTED',
] as const;

export type IntegrationDataClassification = (typeof INTEGRATION_DATA_CLASSIFICATIONS)[number];

export const INTEGRATION_POLICY_DECISION_STATES = ['BLOCKED', 'NOT_CONFIGURED', 'QUEUED'] as const;

export type IntegrationPolicyDecisionState = (typeof INTEGRATION_POLICY_DECISION_STATES)[number];

export const INTEGRATION_CONTROL_PLANE_VERSION = 'integration-control-plane-v0.1' as const;

export const FORBIDDEN_PROVIDER_SIDE_EFFECTS = [
  'CREATE_VERIFIED_CLAIM',
  'DECIDE_APPROVAL',
  'RESUME_PRIME_SESSION',
  'MUTATE_CLAIM',
  'MUTATE_EVIDENCE',
  'CALL_EXTERNAL_AUTHORITY',
  'SIGN',
  'PAY',
  'BOOK',
  'SEND',
  'PUBLISH',
  'EXECUTE_MARKETPLACE_ACTION',
] as const;

export type ForbiddenProviderSideEffect = (typeof FORBIDDEN_PROVIDER_SIDE_EFFECTS)[number];

export const INTEGRATION_REASON_CODES = [
  'INTEGRATION_PROVIDER_UNKNOWN',
  'INTEGRATION_NOT_CONFIGURED',
  'INTEGRATION_POLICY_MISSING',
  'INTEGRATION_POLICY_DISABLED',
  'INTEGRATION_RESTRICTED_DATA_BLOCKED',
  'INTEGRATION_DATA_CLASSIFICATION_BLOCKED',
  'INTEGRATION_PURPOSE_BLOCKED',
  'INTEGRATION_ROLE_REQUIRED',
  'INTEGRATION_IDEMPOTENCY_REQUIRED',
  'INTEGRATION_OPERATION_NOT_IMPLEMENTED',
  'INTEGRATION_OPERATION_NOT_FOUND',
  'INTEGRATION_CANCELLATION_FORBIDDEN',
  'INTEGRATION_REQUEST_QUOTA_EXCEEDED',
  'INTEGRATION_FORBIDDEN_SIDE_EFFECT',
  'INTEGRATION_PROVIDER_MISMATCH',
  'INTEGRATION_OPERATION_EXPIRED',
  'INTEGRATION_AUTONOMOUS_ACTION_FORBIDDEN',
  'INTEGRATION_RETRY_NOT_PERMITTED',
  'INTEGRATION_OPERATION_NOT_SUPPORTED',
  'INTEGRATION_UNSAFE_PAYLOAD_FIELD',
] as const;

export type IntegrationReasonCode = (typeof INTEGRATION_REASON_CODES)[number];

export const INTEGRATION_AUDIT_EVENTS = [
  'INTEGRATION_REQUESTED',
  'INTEGRATION_BLOCKED',
  'INTEGRATION_NOT_CONFIGURED',
  'INTEGRATION_QUEUED',
  'INTEGRATION_CANCELLED',
  'INTEGRATION_EXPIRED',
  'INTEGRATION_FAILED',
  'INTEGRATION_HEALTH_CHECK_SKIPPED',
] as const;

export type IntegrationAuditEventType = (typeof INTEGRATION_AUDIT_EVENTS)[number];

export type IntegrationRequest = {
  providerKey: IntegrationProviderKey;
  operationType: string;
  purpose: string;
  dataClassification: IntegrationDataClassification;
  idempotencyKey: string;
  payloadReference?: Record<string, unknown>;
  timeoutMs?: number;
};

export type IntegrationPolicyDecision = {
  allowed: boolean;
  state: IntegrationPolicyDecisionState;
  reasonCode: IntegrationReasonCode;
  requireHumanApproval: boolean;
};

export type IntegrationOperation = {
  id: string;
  organizationId: string;
  providerKey: IntegrationProviderKey;
  operationType: string;
  state: IntegrationOperationState;
  idempotencyKey: string;
  purpose: string;
  dataClassification: IntegrationDataClassification;
  requestDigestSha256: string | null;
  responseDigestSha256: string | null;
  safeSummary: string | null;
  providerJobReference: string | null;
  requestedBy: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  errorCode: string | null;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  reasonCode: IntegrationReasonCode | null;
  requireHumanApproval: boolean;
};

export type IntegrationProviderRecord = {
  id: string;
  providerKey: IntegrationProviderKey;
  displayName: string;
  defaultStatus: IntegrationProviderStatus;
  externalDataTransfer: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TenantIntegrationPolicy = {
  id: string;
  organizationId: string;
  providerKey: IntegrationProviderKey;
  enabled: boolean;
  allowedDataClassifications: IntegrationDataClassification[];
  allowedPurposes: string[];
  requireHumanApproval: boolean;
  monthlyRequestLimit: number | null;
  monthlyCostLimitDkk: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdapterCapabilities = {
  readonly allowedOperations: readonly string[];
  readonly externalDataTransfer: boolean;
  readonly autonomousActions: false;
  readonly maxTimeoutMs: number;
  readonly maxAttempts: 1;
};

export interface ProviderAdapter {
  providerKey: IntegrationProviderKey;
  readonly capabilities: AdapterCapabilities;
  getStatus(context: TenantContext): Promise<IntegrationProviderStatus>;
  validateRequest(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationPolicyDecision>;
  createOperation(
    context: TenantContext,
    request: IntegrationRequest,
  ): Promise<IntegrationOperation>;
  executeOperation(): Promise<never>;
  cancelOperation(context: TenantContext, operationId: string): Promise<IntegrationOperation>;
}

export function isIntegrationProviderKey(value: string): value is IntegrationProviderKey {
  return (INTEGRATION_PROVIDER_KEYS as readonly string[]).includes(value);
}

export function isForbiddenSideEffect(operationType: string): boolean {
  return (FORBIDDEN_PROVIDER_SIDE_EFFECTS as readonly string[]).includes(operationType);
}

export function assertIntegrationProviderKey(value: IntegrationProviderKey): IntegrationProviderKey {
  switch (value) {
    case 'ROBOFLOW':
    case 'HUGGINGFACE':
    case 'TINKER':
    case 'INKLING':
    case 'HEYGEN':
    case 'LANGGRAPH':
      return value;
    default:
      return assertNever(value);
  }
}
