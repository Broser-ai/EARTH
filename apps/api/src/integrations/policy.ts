import type { TenantContext } from '../auth/types.js';
import { assertNever } from '../contracts.js';
import { assertAuthenticatedTenant, canRequestIntegrationOperation } from './core/rbac.js';
import {
  findAutonomousPayloadField,
  isAutonomousOperationType,
} from './core/capabilities.js';
import {
  isForbiddenSideEffect,
  isIntegrationProviderKey,
  type IntegrationPolicyDecision,
  type IntegrationProviderKey,
  type IntegrationProviderStatus,
  type IntegrationRequest,
  type TenantIntegrationPolicy,
} from './types.js';

export type PolicyEvaluationInput = {
  providerKey: string;
  providerStatus: IntegrationProviderStatus;
  policy: TenantIntegrationPolicy | null;
  monthlyRequestCount: number;
};

export function evaluateIntegrationPolicy(
  context: TenantContext,
  request: IntegrationRequest,
  input: PolicyEvaluationInput,
): IntegrationPolicyDecision {
  assertAuthenticatedTenant(context);

  if (!canRequestIntegrationOperation(context.role)) {
    return blocked('INTEGRATION_ROLE_REQUIRED', false);
  }

  if (!isIntegrationProviderKey(input.providerKey) || input.providerKey !== request.providerKey) {
    return blocked('INTEGRATION_PROVIDER_UNKNOWN', false);
  }

  const requireApproval = input.policy?.requireHumanApproval ?? true;
  const notConfigured = isNotConfiguredStatus(input.providerStatus);

  if (!request.idempotencyKey.trim()) {
    return blocked('INTEGRATION_IDEMPOTENCY_REQUIRED', requireApproval);
  }

  if (isForbiddenSideEffect(request.operationType)) {
    return blocked('INTEGRATION_FORBIDDEN_SIDE_EFFECT', requireApproval);
  }

  if (isAutonomousOperationType(request.operationType)) {
    return blocked('INTEGRATION_AUTONOMOUS_ACTION_FORBIDDEN', requireApproval);
  }

  const autonomousField = findAutonomousPayloadField(request.payloadReference);
  if (autonomousField) {
    return blocked('INTEGRATION_AUTONOMOUS_ACTION_FORBIDDEN', requireApproval);
  }

  if (!input.policy) {
    return blocked('INTEGRATION_POLICY_MISSING', requireApproval);
  }

  if (!input.policy.enabled) {
    return blocked('INTEGRATION_POLICY_DISABLED', input.policy.requireHumanApproval);
  }

  if (request.dataClassification === 'RESTRICTED') {
    return blocked('INTEGRATION_RESTRICTED_DATA_BLOCKED', input.policy.requireHumanApproval);
  }

  if (!input.policy.allowedDataClassifications.includes(request.dataClassification)) {
    return blocked('INTEGRATION_DATA_CLASSIFICATION_BLOCKED', input.policy.requireHumanApproval);
  }

  if (!input.policy.allowedPurposes.includes(request.purpose)) {
    return blocked('INTEGRATION_PURPOSE_BLOCKED', input.policy.requireHumanApproval);
  }

  if (
    input.policy.monthlyRequestLimit !== null &&
    input.monthlyRequestCount >= input.policy.monthlyRequestLimit
  ) {
    return blocked('INTEGRATION_REQUEST_QUOTA_EXCEEDED', input.policy.requireHumanApproval);
  }

  if (notConfigured) {
    return {
      allowed: false,
      state: 'NOT_CONFIGURED',
      reasonCode: 'INTEGRATION_NOT_CONFIGURED',
      requireHumanApproval: input.policy.requireHumanApproval,
    };
  }

  return {
    allowed: false,
    state: 'QUEUED',
    reasonCode: 'INTEGRATION_OPERATION_NOT_IMPLEMENTED',
    requireHumanApproval: input.policy.requireHumanApproval,
  };
}

function blocked(
  reasonCode: IntegrationPolicyDecision['reasonCode'],
  requireHumanApproval: boolean,
): IntegrationPolicyDecision {
  return {
    allowed: false,
    state: 'BLOCKED',
    reasonCode,
    requireHumanApproval,
  };
}

function isNotConfiguredStatus(status: IntegrationProviderStatus): boolean {
  switch (status) {
    case 'NOT_CONFIGURED':
      return true;
    case 'DISABLED':
    case 'AVAILABLE':
    case 'DEGRADED':
    case 'ERROR':
      return false;
    default:
      return assertNever(status);
  }
}

export function knownProviderOrNull(providerKey: string): IntegrationProviderKey | null {
  return isIntegrationProviderKey(providerKey) ? providerKey : null;
}
