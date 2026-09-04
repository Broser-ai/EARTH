import { assertNever, type ReasonCode, type TaskState, type TaskType } from './types.js';

export interface TaskRecord {
  id: string;
  taskType: TaskType;
  state: TaskState;
  input: Record<string, unknown>;
}

export interface TaskRunResult {
  state: TaskState;
  output: Record<string, unknown>;
  errorCode: string | null;
  reasonCodes: ReasonCode[];
  estimatedCostDkk: number;
  estimatedGco2e: number;
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function validateBatch(input: Record<string, unknown>): TaskRunResult {
  const materialClass = asString(input.materialClass).trim();
  const quantityKg = asNumber(input.quantityKg);
  if (!materialClass) {
    return {
      state: 'FAILED',
      output: { ok: false },
      errorCode: 'MATERIAL_CLASS_REQUIRED',
      reasonCodes: ['MATERIAL_CLASS_REQUIRED'],
      estimatedCostDkk: 0,
      estimatedGco2e: 0,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
  if (quantityKg === null || quantityKg <= 0) {
    return {
      state: 'FAILED',
      output: { ok: false },
      errorCode: 'INVALID_QUANTITY',
      reasonCodes: ['INVALID_QUANTITY'],
      estimatedCostDkk: 0,
      estimatedGco2e: 0,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
  return {
    state: 'COMPLETED',
    output: {
      ok: true,
      materialClass,
      quantityKg,
    },
    errorCode: null,
    reasonCodes: [],
    estimatedCostDkk: 0,
    estimatedGco2e: 0,
    llmCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
}

function checkEvidence(input: Record<string, unknown>): TaskRunResult {
  const documentIds = asStringArray(input.documentIds);
  if (documentIds.length === 0) {
    return {
      state: 'PARTIAL',
      output: {
        documentCount: 0,
        inspectedContent: false,
        reasonCode: 'EVIDENCE_MISSING',
      },
      errorCode: 'EVIDENCE_MISSING',
      reasonCodes: ['EVIDENCE_MISSING'],
      estimatedCostDkk: 0,
      estimatedGco2e: 0,
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
  return {
    state: 'COMPLETED',
    output: {
      documentCount: documentIds.length,
      inspectedContent: false,
      documentIds,
    },
    errorCode: null,
    reasonCodes: [],
    estimatedCostDkk: 0,
    estimatedGco2e: 0,
    llmCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
}

function calculateBaseline(input: Record<string, unknown>): TaskRunResult {
  const disposalCostDkk = asNumber(input.disposalCostDkk) ?? 0;
  const co2eKg = asNumber(input.co2eKg) ?? 0;
  return {
    state: 'COMPLETED',
    output: {
      disposalCostDkk,
      co2eKg,
      label: 'INPUT_UNVERIFIED',
      source: 'user-provided',
      verified: false,
    },
    errorCode: null,
    reasonCodes: [],
    estimatedCostDkk: 0,
    estimatedGco2e: 0,
    llmCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
}

function findCandidateRoutes(): TaskRunResult {
  return {
    state: 'PARTIAL',
    output: {
      candidates: [],
      recyclerNetworkConnected: false,
      reasonCode: 'RECYCLER_NETWORK_NOT_CONNECTED',
    },
    errorCode: 'RECYCLER_NETWORK_NOT_CONNECTED',
    reasonCodes: ['RECYCLER_NETWORK_NOT_CONNECTED'],
    estimatedCostDkk: 0,
    estimatedGco2e: 0,
    llmCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
}

function nanochatExtract(): TaskRunResult {
  return {
    state: 'NOT_CONFIGURED',
    output: {
      adapterConfigured: false,
      reasonCode: 'NANOCHAT_NOT_CONFIGURED',
      externalCallAttempted: false,
    },
    errorCode: 'NANOCHAT_NOT_CONFIGURED',
    reasonCodes: ['NANOCHAT_NOT_CONFIGURED'],
    estimatedCostDkk: 0,
    estimatedGco2e: 0,
    llmCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
}

export function runDeterministicTask(task: TaskRecord): TaskRunResult {
  switch (task.taskType) {
    case 'VALIDATE_BATCH':
      return validateBatch(task.input);
    case 'CHECK_EVIDENCE':
      return checkEvidence(task.input);
    case 'CALCULATE_BASELINE':
      return calculateBaseline(task.input);
    case 'FIND_CANDIDATE_ROUTES':
      return findCandidateRoutes();
    case 'NANOCHAT_EXTRACT':
      return nanochatExtract();
    default:
      return assertNever(task.taskType);
  }
}
