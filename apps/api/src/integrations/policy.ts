import { assertNever, type UserRole } from '../contracts.js';
import { canCreateIntegrationOperation } from './core/rbac.js';
import { findAutonomousPayloadField, isAutonomousOperationType } from './core/capabilities.js';
import {
  providerSupportsOperation,
  type IntegrationDataClassification,
  type IntegrationPolicyDecision,
  type IntegrationProviderKey,
  type IntegrationRequest,
  type ProviderRuntimeConfig,
  type TenantIntegrationPolicy,
} from './types.js';

export interface PolicyInputs {
  role: UserRole;
  request: IntegrationRequest;
  runtime: ProviderRuntimeConfig;
  tenantPolicy: TenantIntegrationPolicy | null;
  monthlyRequestCount: number;
  monthlyEstimatedCostDkk: number;
  approvalVerified: boolean;
}

export function evaluateIntegrationPolicy(inputs: PolicyInputs): IntegrationPolicyDecision {
  const schema = evaluateSchema(inputs.request);
  if (!schema.allowed) {
    return schema;
  }

  if (!canCreateIntegrationOperation(inputs.role)) {
    return deny(
      'ROLE_FORBIDDEN',
      'role is not permitted to create integration operations',
      'BLOCKED',
      'DISABLED',
    );
  }

  if (inputs.request.dataClassification === 'RESTRICTED') {
    return deny(
      'RESTRICTED_DATA_BLOCKED',
      'RESTRICTED data must never leave EARTH through an external provider',
      'BLOCKED',
      'DISABLED',
    );
  }

  if (!inputs.tenantPolicy) {
    return deny(
      'TENANT_POLICY_MISSING',
      'tenant has no integration policy for this provider',
      'BLOCKED',
      'DISABLED',
    );
  }

  if (!inputs.tenantPolicy.enabled) {
    return deny(
      'TENANT_POLICY_DISABLED',
      'tenant policy disables this provider',
      'BLOCKED',
      'DISABLED',
    );
  }

  if (!inputs.tenantPolicy.allowedPurposes.includes(inputs.request.purpose)) {
    return deny(
      'PURPOSE_NOT_ALLOWED',
      'purpose is not allow-listed on the tenant integration policy',
      'BLOCKED',
      'DISABLED',
    );
  }

  if (!classificationAllowed(inputs.request.dataClassification, inputs.tenantPolicy)) {
    if (inputs.request.dataClassification === 'CONFIDENTIAL') {
      return deny(
        'CONFIDENTIAL_OUTBOUND_FORBIDDEN',
        'CONFIDENTIAL data requires an explicit tenant outbound-data policy',
        'BLOCKED',
        'DISABLED',
      );
    }
    return deny(
      'DATA_CLASSIFICATION_FORBIDDEN',
      'data classification is not allow-listed on the tenant integration policy',
      'BLOCKED',
      'DISABLED',
    );
  }

  if (!providerSupportsOperation(inputs.request.providerKey, inputs.request.operationType)) {
    return deny(
      'OPERATION_NOT_SUPPORTED',
      'operation type is not allow-listed for this provider',
      'BLOCKED',
      'DISABLED',
    );
  }

  const budget = evaluateBudget(inputs.tenantPolicy, inputs);
  if (!budget.allowed) {
    return budget;
  }

  const runtimeGate = evaluateRuntime(inputs.request.providerKey, inputs.runtime);
  if (!runtimeGate.allowed) {
    return runtimeGate;
  }

  if (inputs.tenantPolicy.requireHumanApproval && !inputs.approvalVerified) {
    return {
      allowed: false,
      reasonCode: 'HUMAN_APPROVAL_REQUIRED',
      message:
        'durable human approval is required before this operation may be queued. No provider call was made.',
      resultingState: 'REQUESTED',
      providerStatus: 'DISABLED',
    };
  }

  return {
    allowed: true,
    reasonCode: 'PROVIDER_NOT_CONFIGURED',
    message:
      'policy gates passed locally; provider remains unavailable until an adapter health check succeeds. No CONNECTED status is granted.',
    resultingState: 'QUEUED',
    providerStatus: 'DISABLED',
  };
}

function evaluateSchema(request: IntegrationRequest): IntegrationPolicyDecision {
  if (!request.idempotencyKey || request.idempotencyKey.trim().length === 0) {
    return deny(
      'IDEMPOTENCY_KEY_REQUIRED',
      'idempotencyKey is required',
      'BLOCKED',
      'NOT_CONFIGURED',
    );
  }
  if (!request.operationType || request.operationType.trim().length === 0) {
    return deny(
      'SCHEMA_VALIDATION_FAILED',
      'operationType is required',
      'BLOCKED',
      'NOT_CONFIGURED',
    );
  }
  if (isAutonomousOperationType(request.operationType)) {
    return deny(
      'AUTONOMOUS_ACTION_FORBIDDEN',
      'booking, payment, submission, and approval operations are forbidden',
      'BLOCKED',
      'DISABLED',
    );
  }
  const autonomousField = findAutonomousPayloadField(request.payload);
  if (autonomousField) {
    return deny(
      'AUTONOMOUS_ACTION_FORBIDDEN',
      `payload must not include autonomous intent field ${autonomousField}`,
      'BLOCKED',
      'DISABLED',
    );
  }
  const unsafe = findUnsafePayloadField(request.payload);
  if (unsafe) {
    return deny(
      'UNSAFE_PAYLOAD_FIELD',
      `payload must not include ${unsafe}`,
      'BLOCKED',
      'DISABLED',
    );
  }
  const serialized = JSON.stringify(request.payload);
  if (serialized.length > 16_384) {
    return deny('PAYLOAD_TOO_LARGE', 'payload exceeds metadata size limit', 'BLOCKED', 'DISABLED');
  }
  return {
    allowed: true,
    reasonCode: 'PROVIDER_NOT_CONFIGURED',
    message: 'schema ok',
    resultingState: 'REQUESTED',
    providerStatus: 'NOT_CONFIGURED',
  };
}

function evaluateBudget(
  policy: TenantIntegrationPolicy,
  inputs: PolicyInputs,
): IntegrationPolicyDecision {
  if (policy.monthlyRequestLimit !== null && inputs.monthlyRequestCount >= policy.monthlyRequestLimit) {
    return deny(
      'BUDGET_EXCEEDED',
      'monthly request limit reached for this provider',
      'BLOCKED',
      'DISABLED',
    );
  }
  const nextCost = inputs.monthlyEstimatedCostDkk + (inputs.request.estimatedCostDkk ?? 0);
  if (policy.monthlyCostLimitDkk !== null && nextCost > Number(policy.monthlyCostLimitDkk)) {
    return deny(
      'BUDGET_EXCEEDED',
      'monthly cost limit reached for this provider',
      'BLOCKED',
      'DISABLED',
    );
  }
  return {
    allowed: true,
    reasonCode: 'PROVIDER_NOT_CONFIGURED',
    message: 'budget ok',
    resultingState: 'REQUESTED',
    providerStatus: 'NOT_CONFIGURED',
  };
}

function evaluateRuntime(
  providerKey: IntegrationProviderKey,
  runtime: ProviderRuntimeConfig,
): IntegrationPolicyDecision {
  switch (providerKey) {
    case 'ROBOFLOW':
    case 'HUGGINGFACE':
    case 'TINKER':
    case 'INKLING':
    case 'HEYGEN':
    case 'LANGGRAPH':
      break;
    default:
      return assertNever(providerKey);
  }

  if (!runtime.credentialPresent && !runtime.enabled) {
    return deny(
      'PROVIDER_NOT_CONFIGURED',
      'provider is not configured and is disabled by default',
      'NOT_CONFIGURED',
      'NOT_CONFIGURED',
    );
  }
  if (runtime.credentialPresent && !runtime.enabled) {
    return deny(
      'PROVIDER_DISABLED',
      'a configured credential does not enable the provider. CONNECTED is not granted.',
      'BLOCKED',
      'DISABLED',
    );
  }
  if (runtime.enabled && !runtime.credentialPresent) {
    return deny(
      'PROVIDER_NOT_CONFIGURED',
      'enable flag is set but no server-side credential is present',
      'NOT_CONFIGURED',
      'NOT_CONFIGURED',
    );
  }
  return {
    allowed: true,
    reasonCode: 'PROVIDER_NOT_CONFIGURED',
    message:
      'server credential and enable flag are present; a successful health/capability check is still required. CONNECTED is not granted.',
    resultingState: 'REQUESTED',
    providerStatus: 'NOT_CONFIGURED',
  };
}

function classificationAllowed(
  classification: IntegrationDataClassification,
  policy: TenantIntegrationPolicy,
): boolean {
  if (classification === 'RESTRICTED') {
    return false;
  }
  return policy.allowedDataClassifications.includes(classification);
}

const UNSAFE_PAYLOAD_KEYS = new Set([
  'apikey',
  'api_key',
  'token',
  'access_token',
  'authorization',
  'password',
  'secret',
  'privatekey',
  'private_key',
  'prompt',
  'rawimage',
  'raw_image',
  'imagebytes',
  'document',
  'documents',
  'pii',
  'webhookurl',
  'webhook_url',
  'callbackurl',
  'callback_url',
]);

export function findUnsafePayloadField(payload: Record<string, unknown>): string | null {
  for (const key of Object.keys(payload)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (UNSAFE_PAYLOAD_KEYS.has(normalized) || UNSAFE_PAYLOAD_KEYS.has(key.toLowerCase())) {
      return key;
    }
  }
  return null;
}

function deny(
  reasonCode: IntegrationPolicyDecision['reasonCode'],
  message: string,
  resultingState: IntegrationPolicyDecision['resultingState'],
  providerStatus: IntegrationPolicyDecision['providerStatus'],
): IntegrationPolicyDecision {
  return {
    allowed: false,
    reasonCode,
    message,
    resultingState,
    providerStatus,
  };
}
