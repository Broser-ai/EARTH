import { describe, expect, it } from 'vitest';
import { evaluateIntegrationPolicy } from '../../../src/integrations/policy.js';
import type { IntegrationRequest, ProviderRuntimeConfig, TenantIntegrationPolicy } from '../../../src/integrations/types.js';

const runtimeOff: ProviderRuntimeConfig = {
  providerKey: 'ROBOFLOW',
  enabled: false,
  credentialPresent: false,
};

const request = (overrides: Partial<IntegrationRequest> = {}): IntegrationRequest => ({
  providerKey: 'ROBOFLOW',
  operationType: 'MATERIAL_IMAGE_INFERENCE',
  purpose: 'MATERIAL_IMAGE_INFERENCE',
  dataClassification: 'INTERNAL',
  idempotencyKey: 'op-1',
  payload: { objectStorageRef: 'earth://internal/batch-1' },
  ...overrides,
});

const policy = (overrides: Partial<TenantIntegrationPolicy> = {}): TenantIntegrationPolicy => ({
  id: 'policy-1',
  organizationId: 'org-1',
  providerKey: 'ROBOFLOW',
  enabled: true,
  allowedDataClassifications: ['INTERNAL'],
  allowedPurposes: ['MATERIAL_IMAGE_INFERENCE'],
  requireHumanApproval: true,
  monthlyRequestLimit: 10,
  monthlyCostLimitDkk: 100,
  ...overrides,
});

describe('evaluateIntegrationPolicy', () => {
  it('returns NOT_CONFIGURED when the provider has no credential and is not enabled', () => {
    const decision = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request(),
      runtime: runtimeOff,
      tenantPolicy: policy(),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('PROVIDER_NOT_CONFIGURED');
    expect(decision.resultingState).toBe('NOT_CONFIGURED');
    expect(decision.providerStatus).toBe('NOT_CONFIGURED');
  });

  it('does not treat a configured credential as CONNECTED when the enable flag is false', () => {
    const decision = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request(),
      runtime: { providerKey: 'ROBOFLOW', enabled: false, credentialPresent: true },
      tenantPolicy: policy(),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('PROVIDER_DISABLED');
    expect(decision.providerStatus).not.toBe('AVAILABLE');
    expect(decision.allowed).toBe(false);
  });

  it('blocks RESTRICTED data even when a tenant policy exists', () => {
    const decision = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request({ dataClassification: 'RESTRICTED' }),
      runtime: { providerKey: 'ROBOFLOW', enabled: true, credentialPresent: true },
      tenantPolicy: policy({
        allowedDataClassifications: ['INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
      }),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('RESTRICTED_DATA_BLOCKED');
    expect(decision.resultingState).toBe('BLOCKED');
  });

  it('blocks a tenant without a policy', () => {
    const decision = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request(),
      runtime: runtimeOff,
      tenantPolicy: null,
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('TENANT_POLICY_MISSING');
    expect(decision.resultingState).toBe('BLOCKED');
  });

  it('blocks a disabled tenant policy', () => {
    const decision = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request(),
      runtime: runtimeOff,
      tenantPolicy: policy({ enabled: false }),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('TENANT_POLICY_DISABLED');
  });

  it('blocks VIEWER from creating operations', () => {
    const decision = evaluateIntegrationPolicy({
      role: 'VIEWER',
      request: request(),
      runtime: runtimeOff,
      tenantPolicy: policy(),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('ROLE_FORBIDDEN');
  });

  it('requires an idempotency key', () => {
    const decision = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request({ idempotencyKey: '' }),
      runtime: runtimeOff,
      tenantPolicy: policy(),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(decision.reasonCode).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('blocks unsupported operations and unsafe payload fields', () => {
    const unsupported = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request({ operationType: 'LAUNCH_SPACE' }),
      runtime: { providerKey: 'ROBOFLOW', enabled: true, credentialPresent: true },
      tenantPolicy: policy(),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: true,
    });
    expect(unsupported.reasonCode).toBe('OPERATION_NOT_SUPPORTED');

    const unsafe = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request({ payload: { apiKey: 'rf_should_never_be_here' } }),
      runtime: runtimeOff,
      tenantPolicy: policy(),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(unsafe.reasonCode).toBe('UNSAFE_PAYLOAD_FIELD');
  });

  it('requires explicit outbound policy for CONFIDENTIAL data', () => {
    const decision = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request({ dataClassification: 'CONFIDENTIAL' }),
      runtime: runtimeOff,
      tenantPolicy: policy(),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(decision.reasonCode).toBe('CONFIDENTIAL_OUTBOUND_FORBIDDEN');
  });

  it('enforces monthly request limits', () => {
    const decision = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request(),
      runtime: { providerKey: 'ROBOFLOW', enabled: true, credentialPresent: true },
      tenantPolicy: policy({ monthlyRequestLimit: 1 }),
      monthlyRequestCount: 1,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: true,
    });
    expect(decision.reasonCode).toBe('BUDGET_EXCEEDED');
  });

  it('requires durable human approval before QUEUED when the policy says so', () => {
    const decision = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request(),
      runtime: { providerKey: 'ROBOFLOW', enabled: true, credentialPresent: true },
      tenantPolicy: policy({ requireHumanApproval: true }),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('HUMAN_APPROVAL_REQUIRED');
    expect(decision.resultingState).toBe('REQUESTED');
    expect(decision.providerStatus).not.toBe('AVAILABLE');
  });

  it('blocks autonomous booking, payment, submission, and approval intents', () => {
    const booking = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request({ operationType: 'BOOKING_SLOT' }),
      runtime: runtimeOff,
      tenantPolicy: policy(),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(booking.allowed).toBe(false);
    expect(['OPERATION_NOT_SUPPORTED', 'AUTONOMOUS_ACTION_FORBIDDEN']).toContain(booking.reasonCode);

    const pay = evaluateIntegrationPolicy({
      role: 'OWNER',
      request: request({ payload: { pay: true, objectStorageRef: 'earth://internal/x' } }),
      runtime: runtimeOff,
      tenantPolicy: policy(),
      monthlyRequestCount: 0,
      monthlyEstimatedCostDkk: 0,
      approvalVerified: false,
    });
    expect(pay.reasonCode).toBe('AUTONOMOUS_ACTION_FORBIDDEN');
  });
});
