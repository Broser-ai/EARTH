import type { TenantContext } from '../auth/types.js';
import { assertNever } from '../contracts.js';
import type { AdapterCapabilities } from './core/capabilities.js';

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

export const INTEGRATION_PURPOSES = [
  'MATERIAL_IMAGE_INFERENCE',
  'MODEL_CATALOG_LOOKUP',
  'APPROVED_INFERENCE_REQUEST',
  'TINKER_TRAINING_JOB_REQUEST',
  'INKLING_POLICY_ARTIFACT_REQUEST',
  'EXECUTIVE_VIDEO_DRAFT_REQUEST',
  'PRIME_WORKFLOW_PROJECTION',
] as const;
export type IntegrationPurpose = (typeof INTEGRATION_PURPOSES)[number];

export const INTEGRATION_DATA_CLASSIFICATIONS = [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'RESTRICTED',
] as const;
export type IntegrationDataClassification = (typeof INTEGRATION_DATA_CLASSIFICATIONS)[number];

export const INTEGRATION_AUDIT_EVENTS = [
  'INTEGRATION_REQUESTED',
  'INTEGRATION_BLOCKED',
  'INTEGRATION_NOT_CONFIGURED',
  'INTEGRATION_QUEUED',
  'INTEGRATION_STARTED',
  'INTEGRATION_SUCCEEDED',
  'INTEGRATION_FAILED',
  'INTEGRATION_CANCELLED',
  'INTEGRATION_EXPIRED',
  'INTEGRATION_HEALTH_CHECKED',
] as const;
export type IntegrationAuditEventType = (typeof INTEGRATION_AUDIT_EVENTS)[number];

export const PROVIDER_OPERATION_TYPES: Record<IntegrationProviderKey, readonly string[]> = {
  ROBOFLOW: ['MATERIAL_IMAGE_INFERENCE'],
  HUGGINGFACE: ['MODEL_CATALOG_LOOKUP', 'APPROVED_INFERENCE_REQUEST'],
  TINKER: ['TINKER_TRAINING_JOB_REQUEST'],
  INKLING: ['INKLING_POLICY_ARTIFACT_REQUEST'],
  HEYGEN: ['EXECUTIVE_VIDEO_DRAFT_REQUEST'],
  LANGGRAPH: ['PRIME_WORKFLOW_PROJECTION'],
};

export const OPERATION_PURPOSE: Record<string, IntegrationPurpose> = {
  MATERIAL_IMAGE_INFERENCE: 'MATERIAL_IMAGE_INFERENCE',
  MODEL_CATALOG_LOOKUP: 'MODEL_CATALOG_LOOKUP',
  APPROVED_INFERENCE_REQUEST: 'APPROVED_INFERENCE_REQUEST',
  TINKER_TRAINING_JOB_REQUEST: 'TINKER_TRAINING_JOB_REQUEST',
  INKLING_POLICY_ARTIFACT_REQUEST: 'INKLING_POLICY_ARTIFACT_REQUEST',
  EXECUTIVE_VIDEO_DRAFT_REQUEST: 'EXECUTIVE_VIDEO_DRAFT_REQUEST',
  PRIME_WORKFLOW_PROJECTION: 'PRIME_WORKFLOW_PROJECTION',
};

export const INTEGRATION_REASON_CODES = [
  'PROVIDER_NOT_CONFIGURED',
  'PROVIDER_DISABLED',
  'TENANT_POLICY_MISSING',
  'TENANT_POLICY_DISABLED',
  'RESTRICTED_DATA_BLOCKED',
  'DATA_CLASSIFICATION_FORBIDDEN',
  'CONFIDENTIAL_OUTBOUND_FORBIDDEN',
  'PURPOSE_NOT_ALLOWED',
  'IDEMPOTENCY_KEY_REQUIRED',
  'OPERATION_NOT_SUPPORTED',
  'SCHEMA_VALIDATION_FAILED',
  'PROVIDER_NOT_ALLOWLISTED',
  'BUDGET_EXCEEDED',
  'HUMAN_APPROVAL_REQUIRED',
  'ROLE_FORBIDDEN',
  'OPERATION_NOT_FOUND',
  'OPERATION_NOT_CANCELLABLE',
  'UNSAFE_PAYLOAD_FIELD',
  'PAYLOAD_TOO_LARGE',
  'CONNECTED_STATUS_FORBIDDEN',
  'AUTONOMOUS_ACTION_FORBIDDEN',
  'RETRY_NOT_PERMITTED',
  'TIMEOUT_EXCEEDED',
  'OPERATION_EXPIRED',
  'UNKNOWN_PROVIDER',
] as const;
export type IntegrationReasonCode = (typeof INTEGRATION_REASON_CODES)[number];

export interface IntegrationRequest {
  providerKey: IntegrationProviderKey;
  operationType: string;
  purpose: IntegrationPurpose;
  dataClassification: IntegrationDataClassification;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  estimatedCostDkk?: number;
  timeoutMs?: number;
  approvalReference?: string | null;
}

export interface IntegrationOperation {
  id: string;
  organizationId: string;
  providerKey: IntegrationProviderKey;
  operationType: string;
  state: IntegrationOperationState;
  idempotencyKey: string;
  purpose: IntegrationPurpose;
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
}

export interface ProviderHealthResult {
  providerKey: IntegrationProviderKey;
  status: IntegrationProviderStatus;
  configured: boolean;
  enabled: boolean;
  healthy: boolean;
  connected: false;
  reasonCode: IntegrationReasonCode | string;
  checkedAt: string;
}

export interface IntegrationPolicyDecision {
  allowed: boolean;
  reasonCode: IntegrationReasonCode;
  message: string;
  resultingState: IntegrationOperationState;
  providerStatus: IntegrationProviderStatus;
}

export interface IntegrationSystemContext {
  readonly correlationId: string;
  readonly actorId: string;
  readonly timeoutMs: number;
}

export interface TenantIntegrationPolicy {
  id: string;
  organizationId: string;
  providerKey: IntegrationProviderKey;
  enabled: boolean;
  allowedDataClassifications: IntegrationDataClassification[];
  allowedPurposes: string[];
  requireHumanApproval: boolean;
  monthlyRequestLimit: number | null;
  monthlyCostLimitDkk: number | null;
}

export interface ProviderRuntimeConfig {
  providerKey: IntegrationProviderKey;
  enabled: boolean;
  credentialPresent: boolean;
}

export interface ProviderAdapter {
  readonly providerKey: IntegrationProviderKey;
  readonly capabilities: AdapterCapabilities;
  getStatus(context: TenantContext): Promise<ProviderHealthResult>;
  checkHealth(systemContext: IntegrationSystemContext): Promise<ProviderHealthResult>;
  validateRequest(context: TenantContext, request: IntegrationRequest): Promise<IntegrationPolicyDecision>;
  createOperation(context: TenantContext, request: IntegrationRequest): Promise<IntegrationOperation>;
  executeOperation(
    systemContext: IntegrationSystemContext,
    operation: IntegrationOperation,
  ): Promise<IntegrationOperation>;
  cancelOperation(context: TenantContext, operationId: string): Promise<IntegrationOperation>;
}

export function isIntegrationProviderKey(value: string): value is IntegrationProviderKey {
  return (INTEGRATION_PROVIDER_KEYS as readonly string[]).includes(value);
}

export function isIntegrationPurpose(value: string): value is IntegrationPurpose {
  return (INTEGRATION_PURPOSES as readonly string[]).includes(value);
}

export function isIntegrationDataClassification(
  value: string,
): value is IntegrationDataClassification {
  return (INTEGRATION_DATA_CLASSIFICATIONS as readonly string[]).includes(value);
}

export function assertIntegrationProviderKey(value: string): IntegrationProviderKey {
  if (!isIntegrationProviderKey(value)) {
    throw new Error(`unknown integration provider: ${value}`);
  }
  return value;
}

export function providerSupportsOperation(
  providerKey: IntegrationProviderKey,
  operationType: string,
): boolean {
  switch (providerKey) {
    case 'ROBOFLOW':
    case 'HUGGINGFACE':
    case 'TINKER':
    case 'INKLING':
    case 'HEYGEN':
    case 'LANGGRAPH':
      return PROVIDER_OPERATION_TYPES[providerKey].includes(operationType);
    default:
      return assertNever(providerKey);
  }
}
