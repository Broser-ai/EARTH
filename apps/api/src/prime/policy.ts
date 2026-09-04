import {
  POLICY_VERSION,
  PolicyError,
  type PlannedTask,
  type PolicyBudget,
  type PolicyPlan,
  type ReasonCode,
  type StartOpportunityInput,
} from './types.js';

export { POLICY_VERSION };

/**
 * PRIME policy v0.1 — deterministic planning only.
 * No LLM, no external adapters, no side effects.
 *
 * Rules:
 * 1. Reject quantity <= 0.
 * 2. Reject missing material class.
 * 3. Never send RESTRICTED data to NanoChat.
 * 4. Always prefer deterministic tasks.
 * 5. Create at most 5 tasks.
 * 6. NanoChat task is optional.
 * 7. NanoChat task must be NOT_CONFIGURED if no local adapter is configured.
 * 8. No task can mutate a report, create a verified claim, send an external message,
 *    sign a contract, book a recycler, or submit anything.
 * 9. Session begins QUEUED and is changed to RUNNING only server-side.
 * 10. Session can be COMPLETED only when all required tasks are COMPLETED or PARTIAL.
 * 11. If a required task fails, session goes to FAILED.
 * 12. If required evidence is missing, session goes to WAITING_FOR_DEPENDENCY.
 * 13. Every transition must create an audit event.
 * 14. Idempotency: same organization ID + idempotency key returns the original session.
 */
export const MATERIAL_OPPORTUNITY_BUDGET: PolicyBudget = {
  maxTasks: 5,
  maxParallelTasks: 4,
  maxLlmCalls: 0,
  maxInputTokens: 0,
  maxOutputTokens: 0,
  maxEstimatedCostDkk: 0,
  maxEstimatedGco2e: 0,
};

const NANOCHAT_ADAPTER_CONFIGURED = false;

export function planMaterialOpportunity(input: StartOpportunityInput): PolicyPlan {
  const materialClass = input.materialBatch.materialClass?.trim() ?? '';
  if (!materialClass) {
    throw new PolicyError('MATERIAL_CLASS_REQUIRED', 'materialClass is required');
  }

  const quantityKg = input.materialBatch.quantityKg;
  if (typeof quantityKg !== 'number' || !Number.isFinite(quantityKg) || quantityKg <= 0) {
    throw new PolicyError('INVALID_QUANTITY', 'quantityKg must be greater than 0');
  }

  const reasonCodes: ReasonCode[] = [];
  const tasks: PlannedTask[] = [];

  // Rule 4: deterministic tasks first.
  tasks.push({
    taskType: 'VALIDATE_BATCH',
    required: true,
    priority: 10,
    initialState: 'QUEUED',
    input: { materialClass, quantityKg },
  });
  tasks.push({
    taskType: 'CHECK_EVIDENCE',
    required: true,
    priority: 20,
    initialState: 'QUEUED',
    input: { documentIds: input.evidence.documentIds },
  });
  tasks.push({
    taskType: 'CALCULATE_BASELINE',
    required: true,
    priority: 30,
    initialState: 'QUEUED',
    input: {
      disposalCostDkk: input.baseline.disposalCostDkk,
      co2eKg: input.baseline.co2eKg,
      label: 'INPUT_UNVERIFIED',
    },
  });
  tasks.push({
    taskType: 'FIND_CANDIDATE_ROUTES',
    required: true,
    priority: 40,
    initialState: 'QUEUED',
    input: { materialClass, quantityKg },
  });

  if (input.evidence.documentIds.length === 0) {
    reasonCodes.push('EVIDENCE_MISSING');
  }

  // Rule 6: NanoChat is optional. Rule 3: never send RESTRICTED data.
  if (input.evidence.extractionRequested) {
    if (input.dataClassification === 'RESTRICTED') {
      reasonCodes.push('NANOCHAT_RESTRICTED_DATA_BLOCK');
    } else if (!NANOCHAT_ADAPTER_CONFIGURED) {
      // Rule 7: NOT_CONFIGURED — no local adapter in v0.1.
      tasks.push({
        taskType: 'NANOCHAT_EXTRACT',
        required: false,
        priority: 50,
        initialState: 'NOT_CONFIGURED',
        input: {
          extractionRequested: true,
          dataClassification: input.dataClassification,
          adapterConfigured: false,
        },
      });
      reasonCodes.push('NANOCHAT_NOT_CONFIGURED');
    }
  }

  // Rule 5
  if (tasks.length > MATERIAL_OPPORTUNITY_BUDGET.maxTasks) {
    throw new PolicyError('BUDGET_EXCEEDED', 'task plan exceeds max_tasks');
  }

  return {
    budget: MATERIAL_OPPORTUNITY_BUDGET,
    tasks,
    reasonCodes,
  };
}

export function nanochatAdapterConfigured(): boolean {
  return NANOCHAT_ADAPTER_CONFIGURED;
}
